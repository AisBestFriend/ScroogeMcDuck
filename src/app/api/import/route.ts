import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { MonthlyRecord, AssetRecord } from "@/types";

export const dynamic = "force-dynamic";

type ImportBody = {
  monthly: Partial<MonthlyRecord>[];
  assets: Partial<AssetRecord>[];
  mode: "merge" | "overwrite";
};

// Strip server-side fields before re-inserting
function stripMeta<T extends Record<string, unknown>>(record: T, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, user_id: _uid, created_at: _c, updated_at: _u, ...rest } = record;
  return { ...rest, user_id: userId };
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const db = createServerSupabaseClient();

  try {
    const { monthly, assets, mode } = (await request.json()) as ImportBody;

    if (mode === "overwrite") {
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        db.from("monthly").delete().eq("user_id", userId),
        db.from("assets").delete().eq("user_id", userId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const monthlyRows = monthly.map((r) => stripMeta(r as Record<string, unknown>, userId));
      const assetRows = assets.map((r) => stripMeta(r as Record<string, unknown>, userId));

      if (monthlyRows.length > 0) {
        const { error } = await db.from("monthly").insert(monthlyRows);
        if (error) throw error;
      }
      if (assetRows.length > 0) {
        const { error } = await db.from("assets").insert(assetRows);
        if (error) throw error;
      }
    } else {
      // Merge: skip records that already exist
      const [{ data: existingMonthly }, { data: existingAssets }] = await Promise.all([
        db.from("monthly").select("year,month").eq("user_id", userId),
        db.from("assets").select("year,month,person").eq("user_id", userId),
      ]);

      const monthlySet = new Set(
        (existingMonthly ?? []).map(
          (r: { year: number; month: number }) => `${r.year}-${r.month}`
        )
      );
      const assetsSet = new Set(
        (existingAssets ?? []).map(
          (r: { year: number; month: number; person: string }) =>
            `${r.year}-${r.month}-${r.person}`
        )
      );

      const newMonthly = monthly
        .filter((r) => !monthlySet.has(`${r.year}-${r.month}`))
        .map((r) => stripMeta(r as Record<string, unknown>, userId));

      const newAssets = assets
        .filter((r) => !assetsSet.has(`${r.year}-${r.month}-${r.person}`))
        .map((r) => stripMeta(r as Record<string, unknown>, userId));

      if (newMonthly.length > 0) {
        const { error } = await db.from("monthly").insert(newMonthly);
        if (error) throw error;
      }
      if (newAssets.length > 0) {
        const { error } = await db.from("assets").insert(newAssets);
        if (error) throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
