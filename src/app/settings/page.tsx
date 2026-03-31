"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Sun, Moon, Loader2, Download, Upload, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useBlurContext } from "@/contexts/blur-context";
import { useMembers } from "@/contexts/members-context";
import { encryptData } from "@/lib/crypto";
import { ImportWizard } from "@/components/settings/import-wizard";

const BLUR_OPTIONS = [
  { label: "끄기", value: 0 },
  { label: "1분", value: 60_000 },
  { label: "3분 (기본)", value: 180_000 },
  { label: "5분", value: 300_000 },
  { label: "10분", value: 600_000 },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { blurTimeout, setBlurTimeout } = useBlurContext();
  const { member1, member2, setMember1, setMember2 } = useMembers();

  // Members edit state
  const [editMember1, setEditMember1] = useState(member1);
  const [editMember2, setEditMember2] = useState(member2);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Google link state
  const [googleLinked, setGoogleLinked] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Export state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exporting, setExporting] = useState(false);

  // Reset state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  useEffect(() => {
    setEditMember1(member1);
    setEditMember2(member2);
  }, [member1, member2]);

  useEffect(() => {
    setMounted(true);
    fetch("/api/user/identities")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.identities) && data.identities.includes("google")) {
          setGoogleLinked(true);
        }
      })
      .catch(() => {});
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "오류", description: "새 비밀번호가 일치하지 않습니다", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "오류", description: "비밀번호는 6자 이상이어야 합니다", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "변경 실패", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "비밀번호 변경 완료" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleGoogleLink = async () => {
    setLinkingGoogle(true);
    try {
      const res = await fetch("/api/user/link-google");
      const data = await res.json();
      if (data.url) {
        // Supabase Google OAuth 페이지로 이동
        window.location.href = data.url;
      } else {
        toast({ title: "연동 실패", description: data.error || "알 수 없는 오류", variant: "destructive" });
      }
    } catch {
      toast({ title: "연동 실패", description: "서버 오류", variant: "destructive" });
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ redirect: false });
    router.push("/login");
  };

  // Export handler
  const handleExport = async () => {
    if (!exportPassword) {
      toast({ title: "오류", description: "비밀번호를 입력하세요", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("데이터 조회 실패");
      const payload = await res.json();

      const { encrypted, iv, salt } = await encryptData(JSON.stringify(payload), exportPassword);
      const fileContent = JSON.stringify({ encrypted, iv, salt });

      const blob = new Blob([fileContent], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `scrooge-backup-${date}.scroogebackup`;
      a.click();
      URL.revokeObjectURL(url);

      setExportDialogOpen(false);
      setExportPassword("");
      toast({ title: "내보내기 완료", description: "백업 파일이 다운로드되었습니다" });
    } catch (err) {
      toast({ title: "내보내기 실패", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Import: file selected → open wizard
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportWizardOpen(true);
    e.target.value = "";
  };

  // Reset handler
  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "초기화 실패");
      setResetDialogOpen(false);
      setResetConfirmText("");
      toast({
        title: "데이터 초기화 완료",
        description: `월별 ${data.deleted.monthly}개, 자산 ${data.deleted.assets}개가 삭제되었습니다`,
      });
      router.refresh();
    } catch (err) {
      toast({ title: "초기화 실패", description: (err as Error).message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header title="설정" description="앱 환경 설정을 관리하세요" />

      <Card>
        <CardHeader>
          <CardTitle>구성원 설정</CardTitle>
          <CardDescription>가계부에 표시될 구성원 이름을 설정하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="member1">구성원1 이름</Label>
              <Input
                id="member1"
                value={editMember1}
                onChange={(e) => setEditMember1(e.target.value)}
                placeholder="구성원1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member2">구성원2 이름</Label>
              <Input
                id="member2"
                value={editMember2}
                onChange={(e) => setEditMember2(e.target.value)}
                placeholder="구성원2"
              />
            </div>
          </div>
          <Button
            className="mt-4"
            onClick={() => {
              setMember1(editMember1.trim() || "찬영");
              setMember2(editMember2.trim() || "연주");
              toast({ title: "구성원 이름이 저장되었습니다" });
            }}
          >
            저장
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>테마</CardTitle>
          <CardDescription>라이트 또는 다크 테마를 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button
              variant={!mounted || theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className="flex items-center gap-2"
            >
              <Sun className="h-4 w-4" />
              라이트
            </Button>
            <Button
              variant={mounted && theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className="flex items-center gap-2"
            >
              <Moon className="h-4 w-4" />
              다크
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>자동 블러</CardTitle>
          <CardDescription>일정 시간 비활성 시 숫자를 자동으로 가립니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {BLUR_OPTIONS.map(({ label, value }) => (
              <Button
                key={value}
                variant={blurTimeout === value ? "default" : "outline"}
                size="sm"
                onClick={() => setBlurTimeout(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data backup card */}
      <Card>
        <CardHeader>
          <CardTitle>데이터 백업</CardTitle>
          <CardDescription>데이터를 암호화하여 내보내거나 백업 파일에서 복원합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => { setExportPassword(""); setExportDialogOpen(true); }}
            >
              <Download className="h-4 w-4" />
              내보내기
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              가져오기
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".scroogebackup"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone card */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">위험 구역</CardTitle>
          <CardDescription>되돌릴 수 없는 작업입니다. 신중하게 진행하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">모든 데이터 초기화</p>
              <p className="text-xs text-muted-foreground">모든 월별 및 자산 데이터를 영구 삭제합니다</p>
            </div>
            <Button
              variant="destructive"
              className="flex items-center gap-2"
              onClick={() => { setResetConfirmText(""); setResetDialogOpen(true); }}
            >
              <Trash2 className="h-4 w-4" />
              모든 데이터 초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>계정</CardTitle>
          <CardDescription>계정 보안 및 연동 설정</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password change */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">비밀번호 변경</h3>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">현재 비밀번호</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">새 비밀번호</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 (6자 이상)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 확인"
                />
              </div>
              <Button type="submit" disabled={savingPassword} className="w-full">
                {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                비밀번호 변경
              </Button>
            </form>
          </div>

          <div className="border-t border-border" />

          {/* Google link */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Google 계정 연동</p>
              <p className="text-xs text-muted-foreground">Google 계정으로 로그인할 수 있습니다</p>
            </div>
            {googleLinked ? (
              <span className="rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground">
                Google 연동됨
              </span>
            ) : (
              <Button variant="outline" onClick={handleGoogleLink} disabled={linkingGoogle}>
                {linkingGoogle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Google 계정 연동
              </Button>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Logout */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">로그아웃</p>
              <p className="text-xs text-muted-foreground">현재 세션에서 로그아웃합니다</p>
            </div>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              로그아웃
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset confirmation dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={(open) => { if (!resetting) { setResetDialogOpen(open); if (!open) setResetConfirmText(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>데이터 초기화</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            모든 월별 데이터와 자산 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="resetConfirm">확인을 위해 <span className="font-mono font-bold">DELETE</span>를 입력하세요</Label>
            <Input
              id="resetConfirm"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)} disabled={resetting}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetting || resetConfirmText !== "DELETE"}
            >
              {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              모두 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export password dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={(open) => { if (!exporting) { setExportDialogOpen(open); if (!open) setExportPassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>데이터 내보내기</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            백업 파일을 암호화할 비밀번호를 입력하세요. 복원 시 동일한 비밀번호가 필요합니다.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="exportPassword">비밀번호</Label>
            <Input
              id="exportPassword"
              type="password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              placeholder="백업 비밀번호"
              onKeyDown={(e) => e.key === "Enter" && handleExport()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)} disabled={exporting}>
              취소
            </Button>
            <Button onClick={handleExport} disabled={exporting || !exportPassword}>
              {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              내보내기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportWizard
        open={importWizardOpen}
        onClose={() => { setImportWizardOpen(false); setImportFile(null); }}
        importFile={importFile}
      />
    </div>
  );
}
