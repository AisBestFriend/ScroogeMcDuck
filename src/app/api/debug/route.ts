import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET() {
  try {
    const db = createServerSupabaseClient();
    const { data, error } = await db.from("monthly").select("id").limit(1);
    return NextResponse.json({
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      dbConnected: !error,
      dbError: error?.message || null,
      rowCount: data?.length ?? 0
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) });
  }
}
