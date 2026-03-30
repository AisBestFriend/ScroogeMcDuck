import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    keyStart: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || "MISSING"
  });
}
