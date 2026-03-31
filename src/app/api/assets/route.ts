import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
import { authOptions } from "@/lib/auth";
import { getAssetRecords, upsertAssetRecord, deleteAssetRecord } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;
  const person = searchParams.get("person") ?? undefined;

  try {
    if (mode === "timeline") {
      const records = await getAssetRecords(session.user.id);
      // Group by year+month, sum net assets (exclude dividend and realized_profit)
      const map = new Map<string, { year: number; month: number; total: number }>();
      for (const r of records) {
        const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
        const net =
          (r.cash ?? 0) +
          (r.investment ?? 0) +
          (r.savings_deposit ?? 0) +
          (r.pension ?? 0) +
          (r.house_deposit ?? 0) +
          (r.apt_payment ?? 0) +
          (r.bonds ?? 0) +
          (r.crypto_gold ?? 0);
        if (map.has(key)) {
          map.get(key)!.total += net;
        } else {
          map.set(key, { year: r.year, month: r.month, total: net });
        }
      }
      const timeline = Array.from(map.values()).sort(
        (a, b) => a.year * 100 + a.month - (b.year * 100 + b.month)
      );
      return NextResponse.json(timeline);
    }

    const records = await getAssetRecords(session.user.id, year, person);
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const record = await upsertAssetRecord(session.user.id, body);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await deleteAssetRecord(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
