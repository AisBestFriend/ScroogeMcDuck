"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { decryptData } from "@/lib/crypto";
import type { MonthlyRecord } from "@/types";

interface BackupPayload {
  version: string;
  exportedAt: string;
  monthly: unknown[];
  assets: unknown[];
}

interface MonthDiff {
  year: number;
  month: number;
  status: "same" | "different" | "backup_only" | "db_only";
  dbData: MonthlyRecord | null;
  backupData: Partial<MonthlyRecord> | null;
  changedFields: string[];
}

interface CompareResult {
  total: number;
  different: number;
  onlyInBackup: number;
  onlyInDB: number;
  diffRate: number;
  monthDiffs: MonthDiff[];
}

const MONTHLY_FIELD_LABELS: Record<string, string> = {
  changyoung_income: "찬영 수입",
  yeonju_income: "연주 수입",
  extra_income: "기타 수입",
  total_income: "총 수입",
  income_memo: "수입 메모",
  changyoung_expense: "찬영 지출",
  yeonju_expense: "연주 지출",
  bucheonpay: "부천페이",
  common_expense: "공통 지출",
  gift_condolence: "경조사",
  total_expense: "총 지출",
  expense_memo: "지출 메모",
  savings: "저축",
};

function formatNum(val: unknown): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "number") return val.toLocaleString("ko-KR");
  return String(val);
}

function StatusBadge({ status }: { status: MonthDiff["status"] }) {
  const map: Record<MonthDiff["status"], { label: string; className: string }> = {
    same: { label: "동일", className: "bg-muted text-muted-foreground" },
    different: { label: "변경됨", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    backup_only: { label: "백업만", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    db_only: { label: "DB만", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function MonthCard({
  diff,
  selection,
  onToggle,
}: {
  diff: MonthDiff;
  selection: "backup" | "keep";
  onToggle?: (val: "backup" | "keep") => void;
}) {
  return (
    <div className="rounded-md border overflow-hidden text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {diff.year}년 {diff.month}월
          </span>
          <StatusBadge status={diff.status} />
        </div>
        {onToggle ? (
          <div className="flex rounded border overflow-hidden text-xs">
            <button
              className={`px-2 py-1 transition-colors ${
                selection === "keep"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => onToggle("keep")}
            >
              기존 유지
            </button>
            <button
              className={`px-2 py-1 border-l transition-colors ${
                selection === "backup"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => onToggle("backup")}
            >
              백업 적용
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">기존 유지 (변경 불가)</span>
        )}
      </div>

      {/* Diff content */}
      {diff.status === "different" && diff.changedFields.length > 0 && (
        <div className="px-3 py-2">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            <div className="font-medium text-muted-foreground pb-1">필드</div>
            <div className="font-medium text-muted-foreground pb-1">기존</div>
            <div className="font-medium text-muted-foreground pb-1">백업</div>
            {diff.changedFields.map((field) => {
              const dbVal = diff.dbData
                ? (diff.dbData as unknown as Record<string, unknown>)[field]
                : null;
              const backupVal = diff.backupData
                ? (diff.backupData as unknown as Record<string, unknown>)[field]
                : null;
              const label = MONTHLY_FIELD_LABELS[field] ?? field;
              return (
                <Fragment key={field}>
                  <div className="py-0.5 text-muted-foreground">{label}</div>
                  <div className="py-0.5 px-1 rounded bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 font-mono truncate">
                    {formatNum(dbVal)}
                  </div>
                  <div className="py-0.5 px-1 rounded bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 font-mono truncate">
                    {formatNum(backupVal)}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      {diff.status === "backup_only" && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          백업에만 있는 데이터입니다. 백업 적용 시 새로 추가됩니다.
        </div>
      )}

      {diff.status === "db_only" && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          DB에만 있는 데이터입니다. 백업에 없으므로 변경할 수 없습니다.
        </div>
      )}
    </div>
  );
}

type Step = "password" | "summary" | "detail";

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
  importFile: File | null;
}

export function ImportWizard({ open, onClose, importFile }: ImportWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("password");
  const [importPassword, setImportPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [backupData, setBackupData] = useState<BackupPayload | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [selections, setSelections] = useState<Record<string, "backup" | "keep">>({});

  useEffect(() => {
    if (!open) {
      setStep("password");
      setImportPassword("");
      setBackupData(null);
      setCompareResult(null);
      setSelections({});
    }
  }, [open]);

  const handleDecryptAndCompare = async () => {
    if (!importFile || !importPassword) return;
    setProcessing(true);
    try {
      const text = await importFile.text();
      const { encrypted, iv, salt } = JSON.parse(text);
      const decrypted = await decryptData(encrypted, iv, salt, importPassword);
      const data = JSON.parse(decrypted) as BackupPayload;
      setBackupData(data);

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "compare", monthly: data.monthly }),
      });
      if (!res.ok) throw new Error("비교 분석 실패");
      const result: CompareResult = await res.json();
      setCompareResult(result);

      // Default: backup_only and different → "backup"
      const init: Record<string, "backup" | "keep"> = {};
      for (const d of result.monthDiffs) {
        if (d.status === "backup_only" || d.status === "different") {
          init[`${d.year}-${d.month}`] = "backup";
        }
      }
      setSelections(init);
      setStep("summary");
    } catch {
      toast({
        title: "복호화 실패",
        description: "비밀번호가 올바르지 않거나 파일이 손상되었습니다",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyAll = async () => {
    if (!backupData) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "overwrite",
          monthly: backupData.monthly,
          assets: backupData.assets,
        }),
      });
      if (!res.ok) throw new Error("적용 실패");
      toast({ title: "전체 적용 완료", description: "백업 데이터로 전체 교체되었습니다" });
      onClose();
    } catch (err) {
      toast({ title: "적용 실패", description: (err as Error).message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleApplySelective = async () => {
    if (!backupData) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "selective",
          selections,
          monthly: backupData.monthly,
          assets: backupData.assets,
        }),
      });
      if (!res.ok) throw new Error("적용 실패");
      const applied = Object.values(selections).filter((v) => v === "backup").length;
      toast({
        title: "선택 적용 완료",
        description: `${applied}개월 데이터가 적용되었습니다`,
      });
      onClose();
    } catch (err) {
      toast({ title: "적용 실패", description: (err as Error).message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const diffMonths = compareResult?.monthDiffs.filter((d) => d.status !== "same") ?? [];
  const isDetailStep = step === "detail";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !processing) onClose(); }}>
      <DialogContent
        className={
          isDetailStep
            ? "sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0"
            : "max-w-sm"
        }
      >
        {/* ── Step: password ── */}
        {step === "password" && (
          <>
            <DialogHeader>
              <DialogTitle>데이터 가져오기</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {importFile?.name && (
                <span className="font-medium">{importFile.name}</span>
              )}{" "}
              복호화 비밀번호를 입력하세요.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="importPassword">비밀번호</Label>
              <Input
                id="importPassword"
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="백업 비밀번호"
                onKeyDown={(e) => e.key === "Enter" && handleDecryptAndCompare()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={processing}>
                취소
              </Button>
              <Button
                onClick={handleDecryptAndCompare}
                disabled={processing || !importPassword}
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                분석
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step: summary ── */}
        {step === "summary" && compareResult && (
          <>
            <DialogHeader>
              <DialogTitle>비교 결과</DialogTitle>
            </DialogHeader>
            {diffMonths.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                모든 데이터가 현재 DB와 동일합니다.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <p className="font-medium">
                    총 {compareResult.total}개월 중{" "}
                    {compareResult.different + compareResult.onlyInBackup + compareResult.onlyInDB}개월 다름{" "}
                    ({compareResult.diffRate}%)
                  </p>
                  {compareResult.different > 0 && (
                    <p className="text-muted-foreground text-xs">
                      · 값이 다른 월: {compareResult.different}개
                    </p>
                  )}
                  {compareResult.onlyInBackup > 0 && (
                    <p className="text-muted-foreground text-xs">
                      · 백업에만 있는 월: {compareResult.onlyInBackup}개
                    </p>
                  )}
                  {compareResult.onlyInDB > 0 && (
                    <p className="text-muted-foreground text-xs">
                      · DB에만 있는 월: {compareResult.onlyInDB}개
                    </p>
                  )}
                </div>
                <div className="rounded-md border divide-y max-h-52 overflow-y-auto">
                  {diffMonths.map((d) => (
                    <div
                      key={`${d.year}-${d.month}`}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span>
                        {d.year}년 {d.month}월
                      </span>
                      <StatusBadge status={d.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
              <Button variant="outline" onClick={onClose} disabled={processing}>
                취소
              </Button>
              {diffMonths.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setStep("detail")}
                    className="flex items-center gap-1"
                  >
                    세부 비교
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleApplyAll}
                    disabled={processing}
                  >
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    전체 적용
                  </Button>
                </>
              )}
              {diffMonths.length === 0 && (
                <Button onClick={onClose}>닫기</Button>
              )}
            </DialogFooter>
          </>
        )}

        {/* ── Step: detail ── */}
        {step === "detail" && compareResult && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <DialogTitle>세부 비교</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {diffMonths.map((d) => {
                const key = `${d.year}-${d.month}`;
                const selection = selections[key] ?? "keep";
                const canToggle = d.status !== "db_only";
                return (
                  <MonthCard
                    key={key}
                    diff={d}
                    selection={selection}
                    onToggle={
                      canToggle
                        ? (val) =>
                            setSelections((prev) => ({ ...prev, [key]: val }))
                        : undefined
                    }
                  />
                );
              })}
            </div>
            <DialogFooter className="px-6 py-4 border-t shrink-0">
              <Button
                variant="outline"
                onClick={() => setStep("summary")}
                disabled={processing}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                뒤로
              </Button>
              <Button onClick={handleApplySelective} disabled={processing}>
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                선택 적용
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
