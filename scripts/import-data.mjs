/**
 * import-data.mjs
 *
 * Reads ~/Downloads/재정현황_정리.xlsx and imports:
 *   - "monthly" sheet  → Supabase `monthly` table
 *   - "assets"  sheet  → Supabase `assets`  table
 *
 * Usage:
 *   IMPORT_USER_ID=<uuid> \
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   node scripts/import-data.mjs
 *
 * Required env vars:
 *   IMPORT_USER_ID            – the user_id to associate with imported rows
 *   NEXT_PUBLIC_SUPABASE_URL  – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY – service-role key (bypasses RLS)
 *
 * Optional env vars:
 *   XLSX_PATH – override the default ~/Downloads/재정현황_정리.xlsx path
 */

import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

// ── Config ──────────────────────────────────────────────────────────────────

const XLSX_PATH =
  process.env.XLSX_PATH ?? join(homedir(), "Downloads", "재정현황_정리.xlsx");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.IMPORT_USER_ID;

if (!SUPABASE_URL || !SUPABASE_KEY || !USER_ID) {
  console.error(
    "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IMPORT_USER_ID"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v) {
  if (v == null || v === "" || v === "-") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function toStr(v) {
  if (v == null || v === "") return null;
  return String(v).trim() || null;
}

function toInt(v) {
  const n = toNum(v);
  return n != null ? Math.round(n) : null;
}

// ── Read workbook ────────────────────────────────────────────────────────────

console.log(`📂 Reading: ${XLSX_PATH}`);
let workbook;
try {
  workbook = XLSX.read(readFileSync(XLSX_PATH), { type: "buffer" });
} catch (err) {
  console.error(`❌ Failed to read file: ${err.message}`);
  process.exit(1);
}

const sheetNames = workbook.SheetNames;
console.log(`   Sheets found: ${sheetNames.join(", ")}`);

// ── Import monthly sheet ─────────────────────────────────────────────────────

async function importMonthly() {
  const sheetName = sheetNames.find((s) =>
    s.toLowerCase().includes("monthly")
  );
  if (!sheetName) {
    console.warn('⚠️  No sheet matching "monthly" found, skipping.');
    return;
  }

  console.log(`\n📅 Importing monthly sheet: "${sheetName}"`);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: null,
  });
  console.log(`   ${rows.length} rows found`);

  const records = rows
    .map((row) => {
      const year = toInt(row["year"] ?? row["연도"] ?? row["Year"]);
      const month = toInt(row["month"] ?? row["월"] ?? row["Month"]);
      if (!year || !month) return null;

      return {
        user_id: USER_ID,
        year,
        month,
        changyoung_income: toNum(row["changyoung_income"] ?? row["찬영수입"] ?? row["찬영_수입"]),
        yeonju_income: toNum(row["yeonju_income"] ?? row["연주수입"] ?? row["연주_수입"]),
        extra_income: toNum(row["extra_income"] ?? row["기타수입"] ?? row["기타_수입"]),
        total_income: toNum(row["total_income"] ?? row["총수입"] ?? row["총_수입"]),
        income_memo: toStr(row["income_memo"] ?? row["수입메모"] ?? row["수입_메모"]),
        changyoung_expense: toNum(row["changyoung_expense"] ?? row["찬영지출"] ?? row["찬영_지출"]),
        yeonju_expense: toNum(row["yeonju_expense"] ?? row["연주지출"] ?? row["연주_지출"]),
        bucheonpay: toNum(row["bucheonpay"] ?? row["부천페이"]),
        common_expense: toNum(row["common_expense"] ?? row["공통지출"] ?? row["공통_지출"]),
        gift_condolence: toNum(row["gift_condolence"] ?? row["경조사비"]),
        total_expense: toNum(row["total_expense"] ?? row["총지출"] ?? row["총_지출"]),
        expense_memo: toStr(row["expense_memo"] ?? row["지출메모"] ?? row["지출_메모"]),
        savings: toNum(row["savings"] ?? row["저축"] ?? row["저축액"]),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  console.log(`   ${records.length} valid rows to upsert`);
  if (records.length === 0) return;

  let success = 0;
  let failed = 0;

  for (const rec of records) {
    const { error } = await supabase
      .from("monthly")
      .upsert(rec, { onConflict: "user_id,year,month" });

    if (error) {
      console.error(`   ❌ ${rec.year}-${String(rec.month).padStart(2, "0")}: ${error.message}`);
      failed++;
    } else {
      console.log(`   ✅ ${rec.year}-${String(rec.month).padStart(2, "0")}`);
      success++;
    }
  }

  console.log(`   Done: ${success} inserted/updated, ${failed} failed`);
}

// ── Import assets sheet ──────────────────────────────────────────────────────

async function importAssets() {
  const sheetName = sheetNames.find((s) =>
    s.toLowerCase().includes("asset")
  );
  if (!sheetName) {
    console.warn('⚠️  No sheet matching "assets" found, skipping.');
    return;
  }

  console.log(`\n🏦 Importing assets sheet: "${sheetName}"`);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: null,
  });
  console.log(`   ${rows.length} rows found`);

  const records = rows
    .map((row) => {
      const year = toInt(row["year"] ?? row["연도"] ?? row["Year"]);
      const month = toInt(row["month"] ?? row["월"] ?? row["Month"]);
      const person = toStr(row["person"] ?? row["사람"] ?? row["Person"]);
      if (!year || !month || !person) return null;

      // Normalize person value to "changyoung" or "yeonju"
      let normalizedPerson = person.toLowerCase();
      if (normalizedPerson.includes("찬영") || normalizedPerson.includes("changyoung")) {
        normalizedPerson = "changyoung";
      } else if (normalizedPerson.includes("연주") || normalizedPerson.includes("yeonju")) {
        normalizedPerson = "yeonju";
      } else {
        normalizedPerson = person;
      }

      return {
        user_id: USER_ID,
        year,
        month,
        person: normalizedPerson,
        snapshot_date: toStr(row["snapshot_date"] ?? row["기준일"] ?? row["날짜"]),
        cash: toNum(row["cash"] ?? row["현금"]),
        investment: toNum(row["investment"] ?? row["투자"]),
        realized_profit: toNum(row["realized_profit"] ?? row["실현손익"] ?? row["실현_손익"]),
        dividend: toNum(row["dividend"] ?? row["배당"]),
        savings_deposit: toNum(row["savings_deposit"] ?? row["예적금"] ?? row["예_적금"]),
        bonds: toNum(row["bonds"] ?? row["채권"]),
        crypto_gold: toNum(row["crypto_gold"] ?? row["코인금"] ?? row["코인_금"]),
        house_deposit: toNum(row["house_deposit"] ?? row["전세보증금"] ?? row["전세_보증금"]),
        pension: toNum(row["pension"] ?? row["연금"]),
        apt_payment: toNum(row["apt_payment"] ?? row["아파트분양금"] ?? row["아파트_분양금"]),
        total: toNum(row["total"] ?? row["합계"] ?? row["총액"]),
      };
    })
    .filter(Boolean);

  console.log(`   ${records.length} valid rows to upsert`);
  if (records.length === 0) return;

  let success = 0;
  let failed = 0;

  for (const rec of records) {
    const { error } = await supabase
      .from("assets")
      .upsert(rec, { onConflict: "user_id,year,month,person" });

    if (error) {
      console.error(
        `   ❌ ${rec.year}-${String(rec.month).padStart(2, "0")} (${rec.person}): ${error.message}`
      );
      failed++;
    } else {
      console.log(`   ✅ ${rec.year}-${String(rec.month).padStart(2, "0")} (${rec.person})`);
      success++;
    }
  }

  console.log(`   Done: ${success} inserted/updated, ${failed} failed`);
}

// ── Run ──────────────────────────────────────────────────────────────────────

console.log(`\n🚀 Starting import for user: ${USER_ID}\n`);
await importMonthly();
await importAssets();
console.log("\n✨ Import complete");
