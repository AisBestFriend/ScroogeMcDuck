"use client";

import { useEffect, useRef, useState } from "react";

const EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
  "touchmove",
] as const;

export function useBlurOnIdle(timeoutMs: number): boolean {
  const [isBlurred, setIsBlurred] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutMs === 0) {
      setIsBlurred(false);
      return;
    }

    const reset = () => {
      setIsBlurred(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsBlurred(true), timeoutMs);
    };

    reset();

    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs]);

  return isBlurred;
}
