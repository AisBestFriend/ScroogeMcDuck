"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthlyForm } from "@/components/monthly/monthly-form";
import { getMonthlyRecord } from "@/lib/queries";
import { generateYearOptions, generateMonthOptions, getCurrentYearMonth } from "@/lib/utils";
import type { MonthlyRecord } from "@/types";

export default function MonthlyPage() {
  const { data: session } = useSession();
  const { year: currentYear, month: currentMonth } = getCurrentYearMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [record, setRecord] = useState<MonthlyRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const yearOptions = generateYearOptions();
  const monthOptions = generateMonthOptions();

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    getMonthlyRecord(session.user.id, selectedYear, selectedMonth)
      .then(setRecord)
      .finally(() => setLoading(false));
  }, [session?.user?.id, selectedYear, selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Header
          title="월별 가계부"
          description="월별 수입, 지출, 저축을 입력하고 관리하세요"
          year={selectedYear}
          month={selectedMonth}
        />
        <div className="flex items-center gap-2">
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(Number(v))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={String(m)}>{m}월</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          로딩 중...
        </div>
      ) : session?.user?.id ? (
        <MonthlyForm
          userId={session.user.id}
          year={selectedYear}
          month={selectedMonth}
          existing={record}
          onSaved={setRecord}
        />
      ) : null}
    </div>
  );
}
