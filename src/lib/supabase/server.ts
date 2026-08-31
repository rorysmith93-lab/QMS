// Supabase client for use on the SERVER (Server Components, Server Actions,
// Route Handlers). It reads/writes the login session via cookies, so the
// server always knows who's logged in on each request.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll was called from a Server Component (not an Action or
            // Route Handler). This can be safely ignored if you have
            // middleware refreshing sessions on every request (we do, below).
          }
        },
      },
    }
  );
}
