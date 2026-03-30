"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssetForm } from "@/components/assets/asset-form";
import { getAssetRecords } from "@/lib/queries";
import { generateYearOptions, formatCurrency } from "@/lib/utils";
import { PERSONS, PERSON_LABELS } from "@/types";
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

export default function AssetsPage() {
  const { data: session } = useSession();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [records, setRecords] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const yearOptions = generateYearOptions();

  const fetchRecords = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const data = await getAssetRecords(session.user.id, selectedYear);
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

  return (
    <div className="space-y-6">
      <Header
        title="자산 현황"
        description="월별 자산 스냅샷을 기록하고 성장 추이를 확인하세요"
      />

      {/* Year tabs */}
      <Tabs value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
        <TabsList>
          {yearOptions.map((y) => (
            <TabsTrigger key={y} value={String(y)}>{y}년</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Person tabs */}
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
            ) : (
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
                        <CardTitle className="flex items-center justify-between text-sm font-semibold">
                          <span>{month}월</span>
                          {!r && <Plus className="h-3 w-3 text-muted-foreground" />}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        {r ? (
                          <div className="space-y-1">
                            {CARD_FIELDS.map(({ key, label }) => (
                              <div key={key} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{label}</span>
                                <span>{formatCurrency(r[key] as number | null)}</span>
                              </div>
                            ))}
                            <div className="mt-2 border-t border-border pt-2 flex justify-between text-xs font-bold">
                              <span>합계</span>
                              <span className="text-yellow-500">{formatCurrency(r.total)}</span>
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
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget &&
                `${selectedYear}년 ${editTarget.month}월 ${PERSON_LABELS[editTarget.person] ?? editTarget.person} 자산`}
            </DialogTitle>
          </DialogHeader>
          {editTarget && session?.user?.id && (
            <AssetForm
              userId={session.user.id}
              year={selectedYear}
              month={editTarget.month}
              person={editTarget.person}
              existing={editTarget.record}
              onSaved={handleSaved}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
