import { supabase } from "./supabase";
import type { MonthlyRecord, AssetRecord } from "@/types";

const db = () => supabase();

// Monthly Queries
export async function getMonthlyRecords(userId: string, year?: number): Promise<MonthlyRecord[]> {
  let query = db()
    .from("monthly")
    .select("*")
    .eq("user_id", userId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (year) query = query.eq("year", year);

  const { data, error } = await query;
  if (error) throw error;
  return (data as MonthlyRecord[]) ?? [];
}

export async function getMonthlyRecord(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyRecord | null> {
  const { data, error } = await db()
    .from("monthly")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as MonthlyRecord) ?? null;
}

export async function upsertMonthlyRecord(
  userId: string,
  record: Partial<MonthlyRecord>
): Promise<MonthlyRecord> {
  const { data, error } = await db()
    .from("monthly")
    .upsert(
      { ...record, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "user_id,year,month" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as MonthlyRecord;
}

export async function deleteMonthlyRecord(userId: string, id: string): Promise<void> {
  const { error } = await db()
    .from("monthly")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

// Asset Queries
export async function getAssetRecords(
  userId: string,
  year?: number,
  person?: string
): Promise<AssetRecord[]> {
  let query = db()
    .from("assets")
    .select("*")
    .eq("user_id", userId)
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  if (year) query = query.eq("year", year);
  if (person) query = query.eq("person", person);

  const { data, error } = await query;
  if (error) throw error;
  return (data as AssetRecord[]) ?? [];
}

export async function upsertAssetRecord(
  userId: string,
  record: Partial<AssetRecord>
): Promise<AssetRecord> {
  const { data, error } = await db()
    .from("assets")
    .upsert(
      { ...record, user_id: userId },
      { onConflict: "user_id,year,month,person" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as AssetRecord;
}

export async function deleteAssetRecord(userId: string, id: string): Promise<void> {
  const { error } = await db()
    .from("assets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
