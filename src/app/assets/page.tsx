"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssetForm } from "@/components/assets/asset-form";
import { AssetLineChart } from "@/components/charts/asset-line-chart";
import { getAssetRecords } from "@/lib/queries";
import { generateYearOptions, generateMonthOptions, getCurrentYearMonth, formatCurrency } from "@/lib/utils";
import { PERSONS, PERSON_LABELS } from "@/types";
import type { AssetRecord } from "@/types";

export default function AssetsPage() {
  const { data: session } = useSession();
  const { year: currentYear, month: currentMonth } = getCurrentYearMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [records, setRecords] = useState<AssetRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const yearOptions = generateYearOptions();
  const monthOptions = generateMonthOptions();

  const fetchRecords = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const [monthRecords, all] = await Promise.all([
        getAssetRecords(session.user.id, selectedYear),
        getAssetRecords(session.user.id),
      ]);
      setRecords(monthRecords.filter((r) => r.month === selectedMonth));
      setAllRecords(all);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const getRecordForPerson = (person: string) =>
    records.find((r) => r.person === person) ?? null;

  const totalAssets = records.reduce((sum, r) => sum + (r.total ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Header
          title="자산 현황"
          description="월별 자산 스냅샷을 기록하고 성장 추이를 확인하세요"
          year={selectedYear}
          month={selectedMonth}
        />
        <div className="flex items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
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

      {/* Total summary */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="sm:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">합계 자산</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-500">{formatCurrency(totalAssets)}</p>
            </CardContent>
          </Card>
          {PERSONS.map((person) => {
            const r = getRecordForPerson(person);
            return (
              <Card key={person}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {PERSON_LABELS[person]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatCurrency(r?.total)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Input tabs per person */}
      <Tabs defaultValue={PERSONS[0]}>
        <TabsList>
          {PERSONS.map((p) => (
            <TabsTrigger key={p} value={p}>{PERSON_LABELS[p]}</TabsTrigger>
          ))}
        </TabsList>
        {PERSONS.map((person) => (
          <TabsContent key={person} value={person} className="mt-4">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                로딩 중...
              </div>
            ) : session?.user?.id ? (
              <AssetForm
                userId={session.user.id}
                year={selectedYear}
                month={selectedMonth}
                person={person}
                existing={getRecordForPerson(person)}
                onSaved={(r) => {
                  setRecords((prev) => {
                    const idx = prev.findIndex((x) => x.person === r.person);
                    if (idx >= 0) {
                      const next = [...prev];
                      next[idx] = r;
                      return next;
                    }
                    return [...prev, r];
                  });
                }}
              />
            ) : null}
          </TabsContent>
        ))}
      </Tabs>

      {/* Chart */}
      {allRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>자산 성장 추이</CardTitle>
            <CardDescription>전체 기간 자산 변화</CardDescription>
          </CardHeader>
          <CardContent>
            <AssetLineChart data={allRecords} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
