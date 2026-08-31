// Supabase client using the SERVICE ROLE key — bypasses Row Level Security
// entirely. Used ONLY by the MES NCR sync webhook
// (src/app/api/ncr-sync/route.ts), which has no logged-in user session to
// anchor public.current_company_id() to: it authenticates the caller
// itself (via the per-company API key stored on companies.ncr_sync_api_key)
// and then needs to read/write on that company's behalf directly.
//
// Do NOT import this from a page, Server Component, or anywhere a browser
// bundle could reach — it has no RLS protection at all. Route Handlers
// only.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
