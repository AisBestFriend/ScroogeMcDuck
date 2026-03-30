"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useBlurOnIdle } from "@/hooks/use-blur-on-idle";

const STORAGE_KEY = "blur-timeout-ms";
const DEFAULT_TIMEOUT = 3 * 60 * 1000;

interface BlurContextValue {
  isBlurred: boolean;
  resetBlur: () => void;
  blurTimeout: number;
  setBlurTimeout: (ms: number) => void;
}

const BlurContext = createContext<BlurContextValue | null>(null);

export function BlurProvider({ children }: { children: React.ReactNode }) {
  const [blurTimeout, setBlurTimeoutState] = useState<number>(DEFAULT_TIMEOUT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setBlurTimeoutState(Number(stored));
    }
    setHydrated(true);
  }, []);

  const [isBlurred, resetBlur] = useBlurOnIdle(hydrated ? blurTimeout : 0);

  const setBlurTimeout = (ms: number) => {
    setBlurTimeoutState(ms);
    localStorage.setItem(STORAGE_KEY, String(ms));
  };

  return (
    <BlurContext.Provider value={{ isBlurred, resetBlur, blurTimeout, setBlurTimeout }}>
      {children}
    </BlurContext.Provider>
  );
}

export function useBlurContext() {
  const ctx = useContext(BlurContext);
  if (!ctx) throw new Error("useBlurContext must be used within BlurProvider");
  return ctx;
}
