import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ProfileResult = {
  id: string;
  company_id: string;
  full_name: string | null;
  role: string;
  companies: {
    name: string;
    primary_color: string;
    logo_path: string | null;
    font_family: string;
  } | null;
};

const CORE_SELECT = "id, company_id, full_name, role, companies(name, primary_color, logo_path)";
const FULL_SELECT = "id, company_id, full_name, role, companies(name, primary_color, logo_path, font_family)";

// Fetches the logged-in user's own profile row (their name, role, and which
// company they belong to). Sends them to /login if they're not signed in.
// Every page under /dashboard that needs to know "whose data is this"
// should start by calling this.
export async function requireProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile, error } = await supabase
    .from("profiles")
    .select(FULL_SELECT)
    .eq("id", user.id)
    .single<ProfileResult>();

  // If an optional/newer branding column (like font_family) hasn't had its
  // migration run yet, that's a reason to fall back gracefully — not a
  // reason to treat someone as logged out. Retry without it so login never
  // depends on an unrelated feature's schema being fully up to date.
  if (error && !profile) {
    const fallback = await supabase
      .from("profiles")
      .select(CORE_SELECT)
      .eq("id", user.id)
      .single<Omit<ProfileResult, "companies"> & {
        companies: Omit<NonNullable<ProfileResult["companies"]>, "font_family"> | null;
      }>();

    if (!fallback.error && fallback.data) {
      profile = {
        ...fallback.data,
        companies: fallback.data.companies
          ? { ...fallback.data.companies, font_family: "inter" }
          : null,
      };
      error = null;
    }
  }

  if (error || !profile) {
    // A logged-in Supabase session with no matching profile row (e.g. left
    // over from earlier testing/deleted data) would otherwise loop forever:
    // proxy.ts sees a valid session and keeps sending them back to
    // /dashboard, while this redirect keeps sending them back to /login.
    // Signing out clears the session so the next check is unambiguous.
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent(
        "Your session needs a fresh login — please sign in again."
      )}`
    );
  }

  return { user, profile, supabase };
}
