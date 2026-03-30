-- ScroogeMcDuck Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Monthly financials table
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- Income
  changyoung_income bigint,
  yeonju_income bigint,
  extra_income bigint,
  total_income bigint,
  income_memo text,

  -- Expense
  changyoung_expense bigint,
  yeonju_expense bigint,
  bucheonpay bigint,
  common_expense bigint,
  gift_condolence bigint,
  total_expense bigint,
  expense_memo text,

  -- Savings
  savings bigint,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, year, month)
);

-- ============================================================
-- Asset snapshots table
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  snapshot_date text,
  person text NOT NULL,

  -- Asset categories
  cash bigint,
  investment bigint,
  realized_profit bigint,
  dividend bigint,
  savings_deposit bigint,
  bonds bigint,
  crypto_gold bigint,
  house_deposit bigint,
  pension bigint,
  apt_payment bigint,

  total bigint,

  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, year, month, person)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Monthly RLS policies
CREATE POLICY "Users can view own monthly records"
  ON monthly FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly records"
  ON monthly FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly records"
  ON monthly FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly records"
  ON monthly FOR DELETE
  USING (auth.uid() = user_id);

-- Assets RLS policies
CREATE POLICY "Users can view own asset records"
  ON assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own asset records"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own asset records"
  ON assets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own asset records"
  ON assets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_monthly_user_year ON monthly(user_id, year);
CREATE INDEX IF NOT EXISTS idx_monthly_user_year_month ON monthly(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_assets_user_year ON assets(user_id, year);
CREATE INDEX IF NOT EXISTS idx_assets_user_person ON assets(user_id, person);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_monthly_updated_at
  BEFORE UPDATE ON monthly
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
