"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { signIn, signOut } from "next-auth/react";
import { Sun, Moon, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Google link state
  const [googleLinked, setGoogleLinked] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
      await signIn("google", { redirect: false });
      setGoogleLinked(true);
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      <Header title="설정" description="앱 환경 설정을 관리하세요" />

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
                연동됨 (google)
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
    </div>
  );
}
