import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const LEVEL_RANK: Record<string, number> = { author: 1, checker: 2, approver: 3 };

// Same design as src/lib/document-authorization.ts (permissive-until-
// configured, ranked levels), deliberately duplicated rather than
// parametrized so SMS Documents and QMS Documents stay independent — see
// safety_documents_schema.sql for why they're separate tables.
export async function canActOnSafetyCategory(
  supabase: SupabaseServerClient,
  companyId: string,
  category: string,
  profileId: string,
  minLevel: "author" | "checker" | "approver"
): Promise<boolean> {
  const { data: rows } = await supabase
    .from("safety_document_authorizations")
    .select("profile_id, level")
    .eq("company_id", companyId)
    .eq("category", category);

  if (!rows || rows.length === 0) return true;

  const mine = rows.find((r) => r.profile_id === profileId);
  if (!mine) return false;

  return (LEVEL_RANK[mine.level] ?? 0) >= LEVEL_RANK[minLevel];
}

export async function getSafetyWorkflowMode(
  supabase: SupabaseServerClient,
  companyId: string,
  category: string
): Promise<"just_approve" | "check_and_approve"> {
  const { data } = await supabase
    .from("safety_document_category_settings")
    .select("workflow_mode")
    .eq("company_id", companyId)
    .eq("category", category)
    .maybeSingle();

  return (data?.workflow_mode as "just_approve" | "check_and_approve" | undefined) ?? "just_approve";
}
