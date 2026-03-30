import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMonthlyRecords, getAssetRecords } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [monthly, assets] = await Promise.all([
      getMonthlyRecords(session.user.id),
      getAssetRecords(session.user.id),
    ]);

    return NextResponse.json({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      monthly,
      assets,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
