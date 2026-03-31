"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssetForm } from "@/components/assets/asset-form";
import { generateYearOptions, formatCurrency, formatKorean, cn } from "@/lib/utils";
import { BlurOverlay } from "@/components/blur-overlay";
import { PERSONS } from "@/types";
import { useMembers } from "@/contexts/members-context";
import type { AssetRecord } from "@/types";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const CARD_FIELDS: { key: keyof AssetRecord; label: string }[] = [
  { key: "cash", label: "현금" },
  { key: "investment", label: "투자" },
  { key: "savings_deposit", label: "예적금" },
  { key: "pension", label: "연금저축" },
  { key: "house_deposit", label: "집보증금" },
  { key: "apt_payment", label: "분양대금" },
];

interface EditTarget {
  month: number;
  person: string;
  record: AssetRecord | null;
}

type NumberMode = "number" | "korean";

export default function AssetsPage() {
  const { data: session } = useSession();
  const { member1, member2 } = useMembers();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [records, setRecords] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [globalFormat, setGlobalFormat] = useState<NumberMode>("number");
  const yearScrollRef = useRef<HTMLDivElement>(null);

  const yearOptions = generateYearOptions();

  const fetchRecords = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/assets?year=${selectedYear}`);
      const data = await res.json();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, selectedYear]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const getRecord = (person: string, month: number) =>
    records.find((r) => r.person === person && r.month === month) ?? null;

  const getMergedRecord = (month: number): Partial<AssetRecord> | null => {
    const r1 = getRecord("changyoung", month);
    const r2 = getRecord("yeonju", month);
    if (!r1 && !r2) return null;
    const sum = (a: number | null | undefined, b: number | null | undefined): number | null => {
      if (a == null && b == null) return null;
      return (a ?? 0) + (b ?? 0);
    };
    return {
      cash: sum(r1?.cash, r2?.cash),
      investment: sum(r1?.investment, r2?.investment),
      savings_deposit: sum(r1?.savings_deposit, r2?.savings_deposit),
      pension: sum(r1?.pension, r2?.pension),
      house_deposit: sum(r1?.house_deposit, r2?.house_deposit),
      apt_payment: sum(r1?.apt_payment, r2?.apt_payment),
      total: sum(
        (r1 ? (r1.cash ?? 0) + (r1.investment ?? 0) + (r1.savings_deposit ?? 0) + (r1.pension ?? 0) + (r1.house_deposit ?? 0) + (r1.apt_payment ?? 0) : null),
        (r2 ? (r2.cash ?? 0) + (r2.investment ?? 0) + (r2.savings_deposit ?? 0) + (r2.pension ?? 0) + (r2.house_deposit ?? 0) + (r2.apt_payment ?? 0) : null)
      ),
    };
  };

  const handleCardClick = (person: string, month: number) => {
    setEditTarget({ month, person, record: getRecord(person, month) });
  };

  const handleSaved = (saved: AssetRecord) => {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.person === saved.person && r.month === saved.month);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setEditTarget(null);
  };

  const formatValue = (amount: number | null | undefined) =>
    globalFormat === "korean" ? formatKorean(amount ?? null) : formatCurrency(amount ?? null);

  const scrollYears = (dir: "left" | "right") => {
    yearScrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  const personLabel = (person: string) => {
    if (person === "changyoung") return member1;
    if (person === "yeonju") return member2;
    return person;
  };

  return (
    <div className="space-y-6">
      <Header
        title="자산 현황"
        description="월별 자산 스냅샷을 기록하고 성장 추이를 확인하세요"
      />

      {/* Year scroll + global format toggle */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => scrollYears("left")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div
          ref={yearScrollRef}
          className="flex flex-1 gap-1 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {yearOptions.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                selectedYear === y
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {y}년
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => scrollYears("right")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {/* Global format toggle */}
        <button
          onClick={() => setGlobalFormat((f) => f === "korean" ? "number" : "korean")}
          className="flex shrink-0 items-center gap-0.5 rounded border border-border px-2 py-1.5 text-xs transition-colors hover:bg-muted"
        >
          <span className={globalFormat === "number" ? "font-bold" : "text-muted-foreground"}>123</span>
          <span className="mx-0.5 text-muted-foreground">|</span>
          <span className={globalFormat === "korean" ? "font-bold" : "text-muted-foreground"}>한글</span>
        </button>
      </div>

      {/* Person tabs */}
      <Tabs defaultValue={PERSONS[0]}>
        <TabsList>
          {PERSONS.map((p) => (
            <TabsTrigger key={p} value={p}>{personLabel(p)}</TabsTrigger>
          ))}
          <TabsTrigger value="all">전체</TabsTrigger>
        </TabsList>

        {PERSONS.map((person) => (
          <TabsContent key={person} value={person} className="mt-4">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                로딩 중...
              </div>
            ) : (
              <BlurOverlay>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {MONTHS.map((month) => {
                    const r = getRecord(person, month);
                    return (
                      <Card
                        key={month}
                        className="cursor-pointer transition-colors hover:border-primary"
                        onClick={() => handleCardClick(person, month)}
                      >
                        <CardHeader className="px-4 pb-2 pt-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-xs text-muted-foreground">
                                {personLabel(person)}
                              </div>
                              <div className="text-sm font-semibold">{month}월</div>
                            </div>
                            {!r && <Plus className="h-3 w-3 text-muted-foreground mt-1" />}
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                          {r ? (
                            <div className="space-y-1">
                              {CARD_FIELDS.map(({ key, label }) => (
                                <div key={key} className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{label}</span>
                                  <span>{formatValue(r[key] as number | null)}</span>
                                </div>
                              ))}
                              <div className="mt-2 border-t border-border pt-2 flex justify-between text-xs font-bold">
                                <span>합계</span>
                                <span className="text-yellow-500">{formatValue(
                                  (r.cash ?? 0) + (r.investment ?? 0) + (r.savings_deposit ?? 0) + (r.pension ?? 0) + (r.house_deposit ?? 0) + (r.apt_payment ?? 0) || null
                                )}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="py-2 text-center text-xs text-muted-foreground">데이터 없음</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </BlurOverlay>
            )}
          </TabsContent>
        ))}

        {/* 전체 탭 */}
        <TabsContent value="all" className="mt-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              로딩 중...
            </div>
          ) : (
            <BlurOverlay>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {MONTHS.map((month) => {
                  const r = getMergedRecord(month);
                  return (
                    <Card key={month} className="transition-colors">
                      <CardHeader className="px-4 pb-2 pt-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">전체</div>
                            <div className="text-sm font-semibold">{month}월</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        {r ? (
                          <div className="space-y-1">
                            {CARD_FIELDS.map(({ key, label }) => (
                              <div key={key} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{label}</span>
                                <span>{formatValue(r[key as keyof AssetRecord] as number | null)}</span>
                              </div>
                            ))}
                            <div className="mt-2 border-t border-border pt-2 flex justify-between text-xs font-bold">
                              <span>합계</span>
                              <span className="text-yellow-500">{formatValue(
                                  (r.cash ?? 0) + (r.investment ?? 0) + (r.savings_deposit ?? 0) + (r.pension ?? 0) + (r.house_deposit ?? 0) + (r.apt_payment ?? 0) || null
                                )}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="py-2 text-center text-xs text-muted-foreground">데이터 없음</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </BlurOverlay>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget &&
                `${selectedYear}년 ${editTarget.month}월 ${personLabel(editTarget.person)} 자산`}
            </DialogTitle>
          </DialogHeader>
          {editTarget && session?.user?.id && (
            <AssetForm
              year={selectedYear}
              month={editTarget.month}
              person={editTarget.person}
              existing={editTarget.record}
              prevRecord={getRecord(editTarget.person, editTarget.month - 1) ?? null}
              onSaved={handleSaved}
              onClose={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
