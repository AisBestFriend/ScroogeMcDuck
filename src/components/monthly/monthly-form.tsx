"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { upsertMonthlyRecord } from "@/lib/queries";
import type { MonthlyRecord } from "@/types";

const schema = z.object({
  changyoung_income: z.string().optional(),
  yeonju_income: z.string().optional(),
  extra_income: z.string().optional(),
  income_memo: z.string().optional(),
  changyoung_expense: z.string().optional(),
  yeonju_expense: z.string().optional(),
  bucheonpay: z.string().optional(),
  common_expense: z.string().optional(),
  gift_condolence: z.string().optional(),
  expense_memo: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function parseAmount(v?: string): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

interface MonthlyFormProps {
  userId: string;
  year: number;
  month: number;
  existing: MonthlyRecord | null;
  onSaved: (record: MonthlyRecord) => void;
}

export function MonthlyForm({ userId, year, month, existing, onSaved }: MonthlyFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      changyoung_income: existing?.changyoung_income?.toString() ?? "",
      yeonju_income: existing?.yeonju_income?.toString() ?? "",
      extra_income: existing?.extra_income?.toString() ?? "",
      income_memo: existing?.income_memo ?? "",
      changyoung_expense: existing?.changyoung_expense?.toString() ?? "",
      yeonju_expense: existing?.yeonju_expense?.toString() ?? "",
      bucheonpay: existing?.bucheonpay?.toString() ?? "",
      common_expense: existing?.common_expense?.toString() ?? "",
      gift_condolence: existing?.gift_condolence?.toString() ?? "",
      expense_memo: existing?.expense_memo ?? "",
    },
  });

  useEffect(() => {
    reset({
      changyoung_income: existing?.changyoung_income?.toString() ?? "",
      yeonju_income: existing?.yeonju_income?.toString() ?? "",
      extra_income: existing?.extra_income?.toString() ?? "",
      income_memo: existing?.income_memo ?? "",
      changyoung_expense: existing?.changyoung_expense?.toString() ?? "",
      yeonju_expense: existing?.yeonju_expense?.toString() ?? "",
      bucheonpay: existing?.bucheonpay?.toString() ?? "",
      common_expense: existing?.common_expense?.toString() ?? "",
      gift_condolence: existing?.gift_condolence?.toString() ?? "",
      expense_memo: existing?.expense_memo ?? "",
    });
  }, [existing, reset]);

  const values = watch();
  const totalIncome =
    (parseAmount(values.changyoung_income) ?? 0) +
    (parseAmount(values.yeonju_income) ?? 0) +
    (parseAmount(values.extra_income) ?? 0);
  const totalExpense =
    (parseAmount(values.changyoung_expense) ?? 0) +
    (parseAmount(values.yeonju_expense) ?? 0) +
    (parseAmount(values.bucheonpay) ?? 0) +
    (parseAmount(values.common_expense) ?? 0) +
    (parseAmount(values.gift_condolence) ?? 0);
  const savings = totalIncome - totalExpense;

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      const record = await upsertMonthlyRecord(userId, {
        year,
        month,
        changyoung_income: parseAmount(data.changyoung_income),
        yeonju_income: parseAmount(data.yeonju_income),
        extra_income: parseAmount(data.extra_income),
        total_income: totalIncome || null,
        income_memo: data.income_memo || null,
        changyoung_expense: parseAmount(data.changyoung_expense),
        yeonju_expense: parseAmount(data.yeonju_expense),
        bucheonpay: parseAmount(data.bucheonpay),
        common_expense: parseAmount(data.common_expense),
        gift_condolence: parseAmount(data.gift_condolence),
        total_expense: totalExpense || null,
        expense_memo: data.expense_memo || null,
        savings: savings || null,
      });
      toast({ title: "저장 완료", description: `${year}년 ${month}월 데이터가 저장되었습니다.` });
      onSaved(record);
    } catch (e) {
      toast({ title: "저장 실패", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString("ko-KR");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Income Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-green-500">수입</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>창영 수입 (원)</Label>
              <Input {...register("changyoung_income")} placeholder="0" type="number" min={0} />
            </div>
            <div className="space-y-2">
              <Label>연주 수입 (원)</Label>
              <Input {...register("yeonju_income")} placeholder="0" type="number" min={0} />
            </div>
            <div className="space-y-2">
              <Label>기타 수입 (원)</Label>
              <Input {...register("extra_income")} placeholder="0" type="number" min={0} />
            </div>
            <div className="space-y-2">
              <Label>총 수입</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-semibold text-green-500">
                ₩{fmt(totalIncome)}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>수입 메모</Label>
            <Textarea {...register("income_memo")} placeholder="수입 관련 메모..." rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Expense Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-red-500">지출</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>창영 지출 (원)</Label>
              <Input {...register("changyoung_expense")} placeholder="0" type="number" min={0} />
            </div>
            <div className="space-y-2">
              <Label>연주 지출 (원)</Label>
              <Input {...register("yeonju_expense")} placeholder="0" type="number" min={0} />
            </div>
            <div className="space-y-2">
              <Label>부천페이 (원)</Label>
              <Input {...register("bucheonpay")} placeholder="0" type="number" min={0} />
            </div>
            <div className="space-y-2">
              <Label>공통 지출 (원)</Label>
              <Input {...register("common_expense")} placeholder="0" type="number" min={0} />
            </div>
            <div className="space-y-2">
              <Label>경조사비 (원)</Label>
              <Input {...register("gift_condolence")} placeholder="0" type="number" min={0} />
            </div>
            <div className="space-y-2">
              <Label>총 지출</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-semibold text-red-500">
                ₩{fmt(totalExpense)}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>지출 메모</Label>
            <Textarea {...register("expense_memo")} placeholder="지출 관련 메모..." rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Savings Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">이번 달 저축</span>
            <span className={`text-xl font-bold ${savings >= 0 ? "text-blue-500" : "text-red-500"}`}>
              ₩{fmt(savings)}
            </span>
          </div>
          {totalIncome > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-muted-foreground">저축률</span>
              <span className="text-sm font-medium">
                {((savings / totalIncome) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        저장
      </Button>
    </form>
  );
}
