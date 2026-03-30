"use client";

import { cn } from "@/lib/utils";
import { useBlurContext } from "@/contexts/blur-context";

interface BlurOverlayProps {
  children: React.ReactNode;
  className?: string;
}

export function BlurOverlay({ children, className }: BlurOverlayProps) {
  const { isBlurred, resetBlur } = useBlurContext();

  const handleUnblur = (e: React.MouseEvent | React.TouchEvent) => {
    if (isBlurred) {
      e.stopPropagation();
      e.preventDefault();
      resetBlur();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div
        style={{
          filter: isBlurred ? "blur(8px)" : undefined,
          pointerEvents: isBlurred ? "none" : undefined,
          userSelect: isBlurred ? "none" : undefined,
        }}
      >
        {children}
      </div>
      {isBlurred && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handleUnblur}
          onTouchStart={handleUnblur}
        >
          <span className="rounded-lg border bg-background/80 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            탭하여 잠금 해제
          </span>
        </div>
      )}
    </div>
  );
}
