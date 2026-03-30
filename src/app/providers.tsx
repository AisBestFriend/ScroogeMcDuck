"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { BlurProvider } from "@/contexts/blur-context";
import { MembersProvider } from "@/contexts/members-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SessionProvider>
        <BlurProvider>
          <MembersProvider>
            {children}
            <Toaster />
          </MembersProvider>
        </BlurProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
