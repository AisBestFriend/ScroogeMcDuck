import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily created singletons to avoid throwing at build time when env vars are absent
let _anonClient: SupabaseClient | undefined;
let _serviceClient: SupabaseClient | undefined;

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
  if (!_serviceClient) {
    _serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _serviceClient;
}
