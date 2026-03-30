"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TrendingUp, TrendingDown, PiggyBank, Percent, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { SavingsBarChart } from "@/components/charts/savings-bar-chart";
import { AssetLineChart } from "@/components/charts/asset-line-chart";
import { getMonthlyRecords, getAssetRecords } from "@/lib/queries";
import { formatCurrency, generateYearOptions, getCurrentYearMonth } from "@/lib/utils";
import type { MonthlyRecord, AssetRecord } from "@/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [selectedYear, setSelectedYear] = useState(getCurrentYearMonth().year);
  const [monthlyData, setMonthlyData] = useState<MonthlyRecord[]>([]);
  const [assetData, setAssetData] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const yearOptions = generateYearOptions();

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const [monthly, assets] = await Promise.all([
        getMonthlyRecords(session.user.id, selectedYear),
        getAssetRecords(session.user.id),
      ]);
      setMonthlyData(monthly);
      setAssetData(assets);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Summary for the selected year
  const summary = monthlyData.reduce(
    (acc, r) => ({
      totalIncome: acc.totalIncome + (r.total_income ?? 0),
      totalExpense: acc.totalExpense + (r.total_expense ?? 0),
      totalSavings: acc.totalSavings + (r.savings ?? 0),
    }),
    { totalIncome: 0, totalExpense: 0, totalSavings: 0 }
  );
  const savingsRate =
    summary.totalIncome > 0 ? (summary.totalSavings / summary.totalIncome) * 100 : 0;

  // Latest month for current summary
  const latestMonth = monthlyData[0];

  const summaryCards = [
    {
      title: "연간 총 수입",
      value: formatCurrency(summary.totalIncome),
      icon: TrendingUp,
      iconClass: "text-green-500",
      sub: latestMonth ? `이번 달: ${formatCurrency(latestMonth.total_income)}` : "데이터 없음",
    },
    {
      title: "연간 총 지출",
      value: formatCurrency(summary.totalExpense),
      icon: TrendingDown,
      iconClass: "text-red-500",
      sub: latestMonth ? `이번 달: ${formatCurrency(latestMonth.total_expense)}` : "데이터 없음",
    },
    {
      title: "연간 총 저축",
      value: formatCurrency(summary.totalSavings),
      icon: PiggyBank,
      iconClass: "text-blue-500",
      sub: latestMonth ? `이번 달: ${formatCurrency(latestMonth.savings)}` : "데이터 없음",
    },
    {
      title: "저축률",
      value: `${savingsRate.toFixed(1)}%`,
      icon: Percent,
      iconClass: "text-yellow-500",
      sub: `${monthlyData.length}개월 기준`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Header
          title="대시보드"
          description={`${selectedYear}년 재무 현황 요약`}
        />
        <div className="flex items-center gap-2">
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(({ title, value, icon: Icon, iconClass, sub }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={cn("h-5 w-5", iconClass)} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>월별 수입/지출/저축</CardTitle>
            <CardDescription>{selectedYear}년 월별 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <SavingsBarChart data={monthlyData} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                {loading ? "로딩 중..." : "데이터가 없습니다"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>자산 성장 추이</CardTitle>
            <CardDescription>전체 기간 자산 변화</CardDescription>
          </CardHeader>
          <CardContent>
            {assetData.length > 0 ? (
              <AssetLineChart data={assetData} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                {loading ? "로딩 중..." : "데이터가 없습니다"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent months table */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>최근 월별 내역</CardTitle>
            <CardDescription>{selectedYear}년 월별 상세</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 text-left font-medium">월</th>
                    <th className="pb-2 text-right font-medium">수입</th>
                    <th className="pb-2 text-right font-medium">지출</th>
                    <th className="pb-2 text-right font-medium">저축</th>
                    <th className="pb-2 text-right font-medium">저축률</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((r) => {
                    const rate =
                      r.total_income && r.total_income > 0
                        ? ((r.savings ?? 0) / r.total_income) * 100
                        : 0;
                    return (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2">{r.month}월</td>
                        <td className="py-2 text-right text-green-500">
                          {formatCurrency(r.total_income)}
                        </td>
                        <td className="py-2 text-right text-red-500">
                          {formatCurrency(r.total_expense)}
                        </td>
                        <td className="py-2 text-right text-blue-500">
                          {formatCurrency(r.savings)}
                        </td>
                        <td className="py-2 text-right">{rate.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
