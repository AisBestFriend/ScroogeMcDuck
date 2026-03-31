import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { upsertMonthlyRecord, upsertAssetRecord } from "@/lib/queries";
import type { MonthlyRecord, AssetRecord } from "@/types";

export const dynamic = "force-dynamic";

const COMPARE_FIELDS = [
  "changyoung_income",
  "yeonju_income",
  "extra_income",
  "total_income",
  "income_memo",
  "changyoung_expense",
  "yeonju_expense",
  "bucheonpay",
  "common_expense",
  "gift_condolence",
  "total_expense",
  "expense_memo",
  "savings",
] as const;

type MergeOverwriteBody = {
  mode: "merge" | "overwrite";
  monthly: Partial<MonthlyRecord>[];
  assets: Partial<AssetRecord>[];
};

type CompareBody = {
  mode: "compare";
  monthly: Partial<MonthlyRecord>[];
};

type SelectiveBody = {
  mode: "selective";
  selections: Record<string, "backup" | "keep">;
  monthly: Partial<MonthlyRecord>[];
  assets: Partial<AssetRecord>[];
};

type ImportBody = MergeOverwriteBody | CompareBody | SelectiveBody;

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
    const body = (await request.json()) as ImportBody;

    // ─── compare mode ────────────────────────────────────────────────────────
    if (body.mode === "compare") {
      const { data: existing, error } = await db
        .from("monthly")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;

      const existingMap = new Map<string, MonthlyRecord>();
      for (const r of existing ?? []) {
        existingMap.set(`${r.year}-${r.month}`, r as MonthlyRecord);
      }

      const backupMap = new Map<string, Partial<MonthlyRecord>>();
      for (const r of body.monthly) {
        backupMap.set(`${r.year}-${r.month}`, r);
      }

      const allKeys = new Set([
        ...Array.from(existingMap.keys()),
        ...Array.from(backupMap.keys()),
      ]);

      type MonthDiff = {
        year: number;
        month: number;
        status: "same" | "different" | "backup_only" | "db_only";
        dbData: MonthlyRecord | null;
        backupData: Partial<MonthlyRecord> | null;
        changedFields: string[];
      };

      const monthDiffs: MonthDiff[] = [];
      for (const key of Array.from(allKeys)) {
        const dbRecord = existingMap.get(key) ?? null;
        const backupRecord = backupMap.get(key) ?? null;

        let status: MonthDiff["status"];
        let changedFields: string[] = [];

        if (!dbRecord) {
          status = "backup_only";
        } else if (!backupRecord) {
          status = "db_only";
        } else {
          changedFields = COMPARE_FIELDS.filter(
            (f) =>
              (dbRecord as unknown as Record<string, unknown>)[f] !==
              (backupRecord as unknown as Record<string, unknown>)[f]
          );
          status = changedFields.length > 0 ? "different" : "same";
        }

        const [yearStr, monthStr] = key.split("-");
        monthDiffs.push({
          year: Number(yearStr),
          month: Number(monthStr),
          status,
          dbData: dbRecord,
          backupData: backupRecord,
          changedFields,
        });
      }

      monthDiffs.sort((a, b) => b.year - a.year || b.month - a.month);

      const different = monthDiffs.filter((d) => d.status === "different").length;
      const onlyInBackup = monthDiffs.filter((d) => d.status === "backup_only").length;
      const onlyInDB = monthDiffs.filter((d) => d.status === "db_only").length;
      const total = monthDiffs.length;
      const nonSame = different + onlyInBackup + onlyInDB;
      const diffRate = total > 0 ? Math.round((nonSame / total) * 100) : 0;

      return NextResponse.json({
        total,
        different,
        onlyInBackup,
        onlyInDB,
        diffRate,
        monthDiffs,
      });
    }

    // ─── selective mode ───────────────────────────────────────────────────────
    if (body.mode === "selective") {
      const { selections, monthly, assets } = body;

      for (const [key, action] of Object.entries(selections)) {
        if (action !== "backup") continue;

        const [yearStr, monthStr] = key.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);

        const monthlyRecord = monthly.find((r) => r.year === year && r.month === month);
        if (monthlyRecord) {
          const stripped = stripMeta(
            monthlyRecord as Record<string, unknown>,
            userId
          ) as Partial<MonthlyRecord>;
          await upsertMonthlyRecord(userId, stripped);
        }

        const assetRecordsForMonth = assets.filter(
          (r) => r.year === year && r.month === month
        );
        for (const assetRecord of assetRecordsForMonth) {
          const stripped = stripMeta(
            assetRecord as Record<string, unknown>,
            userId
          ) as Partial<AssetRecord>;
          await upsertAssetRecord(userId, stripped);
        }
      }

      return NextResponse.json({ success: true });
    }

    // ─── overwrite / merge mode ───────────────────────────────────────────────
    const { monthly, assets, mode } = body as MergeOverwriteBody;

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
