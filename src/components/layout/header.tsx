"use client";

import { getMonthName } from "@/lib/utils";

interface HeaderProps {
  title: string;
  description?: string;
  year?: number;
  month?: number;
}

export function Header({ title, description, year, month }: HeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {year && month && (
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">
            {year}년 {getMonthName(month)}
          </p>
        </div>
      )}
    </div>
  );
}
