import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
import { authOptions } from "@/lib/auth";
import { getMonthlyRecords, getMonthlyRecord, upsertMonthlyRecord, deleteMonthlyRecord } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;

  const mode = searchParams.get("mode");

  try {
    if (mode === "yearly") {
      const records = await getMonthlyRecords(session.user.id);
      const yearMap = new Map<number, { year: number; total_income: number; total_expense: number; savings: number }>();
      for (const r of records) {
        const entry = yearMap.get(r.year) ?? { year: r.year, total_income: 0, total_expense: 0, savings: 0 };
        entry.total_income += r.total_income ?? 0;
        entry.total_expense += r.total_expense ?? 0;
        entry.savings += r.savings ?? 0;
        yearMap.set(r.year, entry);
      }
      const yearlyData = Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
      return NextResponse.json(yearlyData);
    }
    if (year && month) {
      const record = await getMonthlyRecord(session.user.id, year, month);
      return NextResponse.json(record);
    }
    const records = await getMonthlyRecords(session.user.id, year);
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
    const record = await upsertMonthlyRecord(session.user.id, body);
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
    await deleteMonthlyRecord(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
