"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { AssetRecord } from "@/types";
import { PERSON_LABELS } from "@/types";

interface AssetFormValues {
  snapshot_date: string;
  cash: string;
  investment: string;
  realized_profit: string;
  dividend: string;
  savings_deposit: string;
  bonds: string;
  crypto_gold: string;
  house_deposit: string;
  pension: string;
  apt_payment: string;
}

function parseAmount(v?: string): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

const FIELDS: { key: keyof AssetFormValues; label: string }[] = [
  { key: "cash", label: "현금" },
  { key: "investment", label: "투자 (주식/펀드)" },
  { key: "realized_profit", label: "실현 수익" },
  { key: "dividend", label: "배당금" },
  { key: "savings_deposit", label: "예적금" },
  { key: "bonds", label: "채권" },
  { key: "crypto_gold", label: "코인/금" },
  { key: "house_deposit", label: "집보증금" },
  { key: "pension", label: "연금저축" },
  { key: "apt_payment", label: "분양대금" },
];

interface AssetFormProps {
  year: number;
  month: number;
  person: string;
  existing: AssetRecord | null;
  onSaved: (record: AssetRecord) => void;
  onClose: () => void;
}

export function AssetForm({ year, month, person, existing, onSaved, onClose }: AssetFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const toDefaults = (r: AssetRecord | null): AssetFormValues => ({
    snapshot_date: r?.snapshot_date ?? "",
    cash: r?.cash?.toString() ?? "",
    investment: r?.investment?.toString() ?? "",
    realized_profit: r?.realized_profit?.toString() ?? "",
    dividend: r?.dividend?.toString() ?? "",
    savings_deposit: r?.savings_deposit?.toString() ?? "",
    bonds: r?.bonds?.toString() ?? "",
    crypto_gold: r?.crypto_gold?.toString() ?? "",
    house_deposit: r?.house_deposit?.toString() ?? "",
    pension: r?.pension?.toString() ?? "",
    apt_payment: r?.apt_payment?.toString() ?? "",
  });

  const { register, handleSubmit, reset, watch } = useForm<AssetFormValues>({
    defaultValues: toDefaults(existing),
  });

  useEffect(() => {
    reset(toDefaults(existing));
  }, [existing, reset]);

  const values = watch();
  const total = FIELDS.reduce((sum, { key }) => sum + (parseAmount(values[key]) ?? 0), 0);

  const onSubmit = async (data: AssetFormValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          person,
          snapshot_date: data.snapshot_date || null,
          cash: parseAmount(data.cash),
          investment: parseAmount(data.investment),
          realized_profit: parseAmount(data.realized_profit),
          dividend: parseAmount(data.dividend),
          savings_deposit: parseAmount(data.savings_deposit),
          bonds: parseAmount(data.bonds),
          crypto_gold: parseAmount(data.crypto_gold),
          house_deposit: parseAmount(data.house_deposit),
          pension: parseAmount(data.pension),
          apt_payment: parseAmount(data.apt_payment),
          total,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "저장 실패");
      }
      const record = await res.json();
      toast({ title: "저장 완료", description: `${year}년 ${month}월 ${PERSON_LABELS[person] ?? person} 자산이 저장되었습니다.` });
      onSaved(record);
    } catch (e) {
      toast({ title: "저장 실패", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>스냅샷 날짜</Label>
        <Input {...register("snapshot_date")} type="date" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label>{label} (원)</Label>
            <Input {...register(key)} placeholder="0" type="number" min={0} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-md border border-border bg-muted px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">총 자산</span>
        <span className="text-lg font-bold text-yellow-500">
          ₩{total.toLocaleString("ko-KR")}
        </span>
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        저장
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={onClose}>
        닫기
      </Button>
    </form>
  );
}
