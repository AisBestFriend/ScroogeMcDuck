import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "₩0";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number | null | undefined): string {
  if (amount == null) return "0";
  return new Intl.NumberFormat("ko-KR").format(amount);
}

export function getMonthName(month: number): string {
  const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  return months[month - 1] ?? `${month}월`;
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function generateYearOptions(startYear = 2020): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= startYear; y--) {
    years.push(y);
  }
  return years;
}

export function generateMonthOptions(): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

export function formatKorean(amount: number | null | undefined): string {
  if (amount == null || amount === 0) return "0원";

  const eok = Math.floor(amount / 100_000_000);
  const rem1 = amount % 100_000_000;

  if (eok > 0) {
    const cheonman = Math.floor(rem1 / 10_000_000);
    const baekman = Math.floor((rem1 % 10_000_000) / 1_000_000);
    const parts: string[] = [`${eok}억`];
    if (cheonman > 0) parts.push(`${cheonman}천`);
    if (baekman > 0) {
      parts.push(`${baekman}백만`);
    } else if (cheonman > 0) {
      parts[parts.length - 1] += "만";
    }
    return parts.join(" ") + "원";
  }

  const man = Math.floor(amount / 10_000);
  if (man > 0) return `${man}만원`;
  return `${amount}원`;
}
