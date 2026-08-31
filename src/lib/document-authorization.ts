import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const LEVEL_RANK: Record<string, number> = { author: 1, checker: 2, approver: 3 };

// Whether `profileId` is allowed to act at (at least) `minLevel` for a
// given document category. If NO authorizations have been configured for
// that category at all, everyone in the company is allowed — the matrix
// only starts restricting things once you've actually assigned someone a
// level for that category, so turning this feature on can't silently
// lock you out of your own documents before you've set it up.
export async function canActOnCategory(
  supabase: SupabaseServerClient,
  companyId: string,
  category: string,
  profileId: string,
  minLevel: "author" | "checker" | "approver"
): Promise<boolean> {
  const { data: rows } = await supabase
    .from("document_authorizations")
    .select("profile_id, level")
    .eq("company_id", companyId)
    .eq("category", category);

  if (!rows || rows.length === 0) return true;

  const mine = rows.find((r) => r.profile_id === profileId);
  if (!mine) return false;

  return (LEVEL_RANK[mine.level] ?? 0) >= LEVEL_RANK[minLevel];
}

export async function getWorkflowMode(
  supabase: SupabaseServerClient,
  companyId: string,
  category: string
): Promise<"just_approve" | "check_and_approve"> {
  const { data } = await supabase
    .from("document_category_settings")
    .select("workflow_mode")
    .eq("company_id", companyId)
    .eq("category", category)
    .maybeSingle();

  return (data?.workflow_mode as "just_approve" | "check_and_approve" | undefined) ?? "just_approve";
}
