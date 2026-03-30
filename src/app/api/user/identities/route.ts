import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createServerSupabaseClient();
  const { data, error } = await adminClient.auth.admin.getUserById(session.user.id);
  if (error || !data.user) {
    return NextResponse.json({ identities: [] });
  }

  const identities = (data.user.identities ?? []).map((i) => i.provider);
  return NextResponse.json({ identities });
}
