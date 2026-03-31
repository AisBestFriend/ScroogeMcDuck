import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redirectTo = encodeURIComponent(
    (process.env.NEXTAUTH_URL ?? "https://scroogemcduck.vercel.app") + "/settings"
  );

  const googleAuthUrl = `https://dskikdksvlbimqimswpy.supabase.co/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;

  return NextResponse.json({ url: googleAuthUrl });
}
