import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily created singletons to avoid throwing at build time when env vars are absent
let _anonClient: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _anonClient;
}

// Re-export as `supabase` for convenience — call getSupabaseClient() at the call site
export { getSupabaseClient as supabase };

export function createServerSupabaseClient(): SupabaseClient {
  // 매 호출마다 새 클라이언트 생성 (서버리스 환경에서 싱글톤 캐시 금지)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(`Supabase 환경변수 누락: URL=${!!url}, KEY=${!!key}`);
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
