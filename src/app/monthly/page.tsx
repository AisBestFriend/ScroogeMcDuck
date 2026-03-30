"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonthlyForm } from "@/components/monthly/monthly-form";
import { formatCurrency, generateYearOptions, getCurrentYearMonth } from "@/lib/utils";
import { BlurOverlay } from "@/components/blur-overlay";
import type { MonthlyRecord } from "@/types";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function MonthlyPage() {
  const { data: session } = useSession();
  const { year: currentYear, month: currentMonth } = getCurrentYearMonth();
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(String(currentYear));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editYear, setEditYear] = useState(currentYear);
  const [editMonth, setEditMonth] = useState(currentMonth);

  const yearOptions = generateYearOptions();

  const loadRecords = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const res = await fetch("/api/monthly");
      const data = await res.json();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const getRecord = (year: number, month: number) =>
    records.find((r) => r.year === year && r.month === month) ?? null;

  const openEdit = (year: number, month: number) => {
    setEditYear(year);
    setEditMonth(month);
    setDialogOpen(true);
  };

  const handleSaved = (record: MonthlyRecord) => {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.year === record.year && r.month === record.month);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [record, ...prev];
    });
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Header
          title="월별 가계부"
          description="월별 수입, 지출, 저축을 카드로 확인하고 관리하세요"
        />
        <Button size="sm" onClick={() => openEdit(Number(activeYear), currentMonth)}>
          <Plus className="h-4 w-4 mr-1" />
          새 데이터
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          로딩 중...
        </div>
      ) : (
        <Tabs value={activeYear} onValueChange={setActiveYear}>
          <TabsList className="flex-wrap h-auto gap-1">
            {yearOptions.map((y) => (
              <TabsTrigger key={y} value={String(y)}>
                {y}년
              </TabsTrigger>
            ))}
          </TabsList>

          {yearOptions.map((year) => (
            <TabsContent key={year} value={String(year)} className="mt-4">
              <BlurOverlay>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {MONTHS.map((month) => {
                  const rec = getRecord(year, month);
                  const isCurrentMonth = year === currentYear && month === currentMonth;
                  const savings = rec?.savings ?? null;

                  return (
                    <Card
                      key={month}
                      onClick={() => openEdit(year, month)}
                      className={[
                        "cursor-pointer transition-colors hover:bg-accent",
                        isCurrentMonth ? "ring-2 ring-primary" : "",
                        !rec ? "opacity-50" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{month}월</span>
                          {savings != null && (
                            <span
                              className={`text-xs font-bold ${
                                savings >= 0 ? "text-blue-500" : "text-red-500"
                              }`}
                            >
                              {formatCurrency(savings)}
                            </span>
                          )}
                        </div>

                        {rec ? (
                          <>
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">수입</span>
                                <span className="text-green-500">
                                  {rec.total_income != null ? formatCurrency(rec.total_income) : "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">지출</span>
                                <span className="text-red-500">
                                  {rec.total_expense != null
                                    ? formatCurrency(rec.total_expense)
                                    : "-"}
                                </span>
                              </div>
                            </div>
                            {(rec.income_memo || rec.expense_memo) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {rec.income_memo || rec.expense_memo}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">데이터 없음</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
          </BlurOverlay>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editYear}년 {editMonth}월
            </DialogTitle>
          </DialogHeader>
          {session?.user?.id && (
            <MonthlyForm
              
              year={editYear}
              month={editMonth}
              existing={getRecord(editYear, editMonth)}
              onSaved={handleSaved}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
