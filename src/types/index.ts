export interface MonthlyRecord {
  id: string;
  user_id: string;
  year: number;
  month: number;
  changyoung_income: number | null;
  yeonju_income: number | null;
  extra_income: number | null;
  total_income: number | null;
  income_memo: string | null;
  changyoung_expense: number | null;
  yeonju_expense: number | null;
  bucheonpay: number | null;
  common_expense: number | null;
  gift_condolence: number | null;
  total_expense: number | null;
  expense_memo: string | null;
  savings: number | null;
  created_at: string;
  updated_at: string;
}

export interface AssetRecord {
  id: string;
  user_id: string;
  year: number;
  month: number;
  snapshot_date: string | null;
  person: string;
  cash: number | null;
  investment: number | null;
  realized_profit: number | null;
  dividend: number | null;
  savings_deposit: number | null;
  bonds: number | null;
  crypto_gold: number | null;
  house_deposit: number | null;
  pension: number | null;
  apt_payment: number | null;
  total: number | null;
  created_at: string;
}

export interface MonthlyFormValues {
  year: number;
  month: number;
  changyoung_income: string;
  yeonju_income: string;
  extra_income: string;
  income_memo: string;
  changyoung_expense: string;
  yeonju_expense: string;
  bucheonpay: string;
  common_expense: string;
  gift_condolence: string;
  expense_memo: string;
}

export interface AssetFormValues {
  year: number;
  month: number;
  snapshot_date: string;
  person: string;
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

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  savingsRate: number;
}

export const PERSONS = ["changyoung", "yeonju"] as const;
export type Person = (typeof PERSONS)[number];

export const PERSON_LABELS: Record<string, string> = {
  changyoung: "찬영",
  yeonju: "연주",
};
