"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TrendingUp, TrendingDown, PiggyBank, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn, formatCurrency, generateYearOptions, getCurrentYearMonth } from "@/lib/utils";
import { BlurOverlay } from "@/components/blur-overlay";
import type { MonthlyRecord } from "@/types";

type ViewMode = "monthly" | "yearly";

interface YearlySummary {
  year: number;
  total_income: number;
  total_expense: number;
  savings: number;
}

interface TooltipEntry {
  name: string;
  color: string;
  value: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

function DeltaBadge({
  current,
  prev,
  label,
}: {
  current: number;
  prev: number;
  label: string;
}) {
  if (prev === 0) {
    return <p className="text-xs text-muted-foreground mt-1">{label} 데이터 없음</p>;
  }
  const diff = current - prev;
  const pct = (diff / prev) * 100;
  const isUp = diff >= 0;
  return (
    <p className={cn("text-xs mt-1", isUp ? "text-green-500" : "text-red-500")}>
      {isUp ? "▲" : "▼"} {formatCurrency(Math.abs(diff))} ({isUp ? "+" : ""}
      {pct.toFixed(1)}%) {label} 대비
    </p>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { year: currentYear, month: currentMonth } = getCurrentYearMonth();

  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [monthlyData, setMonthlyData] = useState<MonthlyRecord[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const yearOptions = generateYearOptions();

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      if (viewMode === "monthly") {
        const res = await fetch(`/api/monthly?year=${selectedYear}`);
        const data = await res.json();
        setMonthlyData(data);
      } else {
        const res = await fetch("/api/monthly?mode=yearly");
        const data: YearlySummary[] = await res.json();
        setYearlyData(data);
      }
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, viewMode, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Monthly mode: selected & prev month records
  const selectedRecord = monthlyData.find((r) => r.month === selectedMonth);
  const prevRecord = monthlyData.find((r) => r.month === selectedMonth - 1);

  // Yearly mode: selected & prev year summaries
  const selectedYearly = yearlyData.find((y) => y.year === selectedYear);
  const prevYearly = yearlyData.find((y) => y.year === selectedYear - 1);

  // Chart data
  const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const r = monthlyData.find((rec) => rec.month === month);
    return {
      name: `${month}월`,
      수입: r?.total_income ?? 0,
      지출: r?.total_expense ?? 0,
      저축: r?.savings ?? 0,
    };
  });

  const yearlyChartData = yearlyData.map((y) => ({
    name: `${y.year}년`,
    수입: y.total_income,
    지출: y.total_expense,
    저축: y.savings,
  }));

  const chartData = viewMode === "monthly" ? monthlyChartData : yearlyChartData;
  const hasChartData = chartData.some((d) => d.수입 > 0 || d.지출 > 0 || d.저축 > 0);

  const comparisonLabel = viewMode === "monthly" ? "전월" : "전년";

  const cardDefs = [
    {
      title: "수입",
      icon: TrendingUp,
      iconClass: "text-green-500",
      current:
        viewMode === "monthly"
          ? (selectedRecord?.total_income ?? 0)
          : (selectedYearly?.total_income ?? 0),
      prev:
        viewMode === "monthly"
          ? (prevRecord?.total_income ?? 0)
          : (prevYearly?.total_income ?? 0),
    },
    {
      title: "지출",
      icon: TrendingDown,
      iconClass: "text-red-500",
      current:
        viewMode === "monthly"
          ? (selectedRecord?.total_expense ?? 0)
          : (selectedYearly?.total_expense ?? 0),
      prev:
        viewMode === "monthly"
          ? (prevRecord?.total_expense ?? 0)
          : (prevYearly?.total_expense ?? 0),
    },
    {
      title: "저축",
      icon: PiggyBank,
      iconClass: "text-blue-500",
      current:
        viewMode === "monthly"
          ? (selectedRecord?.savings ?? 0)
          : (selectedYearly?.savings ?? 0),
      prev:
        viewMode === "monthly"
          ? (prevRecord?.savings ?? 0)
          : (prevYearly?.savings ?? 0),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + Controls */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Header
          title="대시보드"
          description={
            viewMode === "monthly"
              ? `${selectedYear}년 ${selectedMonth}월 재무 현황`
              : `${selectedYear}년 재무 현황 (연도별)`
          }
        />
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setViewMode("monthly")}
            >
              월별
            </button>
            <button
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setViewMode("yearly")}
            >
              연도별
            </button>
          </div>

          {/* Year Select */}
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Select (monthly mode only) */}
          {viewMode === "monthly" && (
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number(v))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}월
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Refresh */}
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="flex h-48 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards */}
          <BlurOverlay>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {cardDefs.map(({ title, icon: Icon, iconClass, current, prev }) => (
                <Card key={title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {title}
                    </CardTitle>
                    <Icon className={cn("h-5 w-5", iconClass)} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(current)}</p>
                    <DeltaBadge current={current} prev={prev} label={comparisonLabel} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </BlurOverlay>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>
                {viewMode === "monthly" ? `${selectedYear}년 월별 현황` : "연도별 비교"}
              </CardTitle>
              <CardDescription>
                {viewMode === "monthly"
                  ? "막대: 수입/지출 · 라인: 저축"
                  : "연도별 총 수입/지출/저축 비교"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasChartData ? (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <Bar dataKey="수입" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="지출" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="저축"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
