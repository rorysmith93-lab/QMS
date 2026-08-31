// Supabase client for use in the BROWSER (client components).
// This uses the public "anon" key, which is safe to expose — it can only
// do what our Row Level Security policies allow it to do.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
