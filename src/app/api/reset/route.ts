import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const db = createServerSupabaseClient();

  try {
    const [{ error: e1, count: monthlyCount }, { error: e2, count: assetsCount }] =
      await Promise.all([
        db.from("monthly").delete({ count: "exact" }).eq("user_id", userId),
        db.from("assets").delete({ count: "exact" }).eq("user_id", userId),
      ]);

    if (e1) throw e1;
    if (e2) throw e2;

    return NextResponse.json({
      success: true,
      deleted: { monthly: monthlyCount ?? 0, assets: assetsCount ?? 0 },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
