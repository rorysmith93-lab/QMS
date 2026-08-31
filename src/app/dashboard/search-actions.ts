"use server";

import { requireProfile } from "@/lib/current-profile";
import { canAccess } from "@/lib/roles";

export type SearchResult = {
  type: string;
  label: string;
  sublabel?: string;
  href: string;
};

const RESULT_LIMIT = 5;

// Powers the Cmd+K command palette. Runs one small `ilike` query per
// record type rather than a single cross-table query — simpler to read,
// and each table is small enough at this scale that it's not worth
// reaching for full-text search infrastructure yet.
export async function globalSearch(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { profile, supabase } = await requireProfile();
  const like = `%${trimmed}%`;
  const canSeeAudits = canAccess(profile.role, "internalAudits");

  const [ncs, audits, docs, sops, workInstructions, equipment] = await Promise.all([
    supabase
      .from("non_conformances")
      .select("id, ncr_number, title")
      .or(`title.ilike.${like},ncr_number.ilike.${like}`)
      .limit(RESULT_LIMIT),
    // No point querying at all for a role that can't open the result anyway.
    canSeeAudits
      ? supabase
          .from("internal_audits")
          .select("id, audit_number, title")
          .or(`title.ilike.${like},audit_number.ilike.${like}`)
          .limit(RESULT_LIMIT)
      : Promise.resolve({ data: [] as { id: string; audit_number: string; title: string }[] }),
    supabase.from("documents").select("id, title").ilike("title", like).limit(RESULT_LIMIT),
    supabase.from("sops").select("id, title").ilike("title", like).limit(RESULT_LIMIT),
    supabase.from("work_instructions").select("id, title").ilike("title", like).limit(RESULT_LIMIT),
    supabase.from("equipment_items").select("id, name").ilike("name", like).limit(RESULT_LIMIT),
  ]);

  const results: SearchResult[] = [];

  for (const nc of ncs.data ?? []) {
    results.push({
      type: "Non-Conformance",
      label: nc.title,
      sublabel: nc.ncr_number,
      href: `/dashboard/non-conformances/${nc.id}`,
    });
  }
  for (const audit of audits.data ?? []) {
    results.push({
      type: "Internal Audit",
      label: audit.title,
      sublabel: audit.audit_number,
      href: `/dashboard/internal-audits/${audit.id}`,
    });
  }
  for (const doc of docs.data ?? []) {
    results.push({ type: "Document", label: doc.title, href: `/dashboard/documents/${doc.id}` });
  }
  for (const sop of sops.data ?? []) {
    results.push({ type: "SOP", label: sop.title, href: `/dashboard/sops/${sop.id}` });
  }
  for (const wi of workInstructions.data ?? []) {
    results.push({ type: "Work Instruction", label: wi.title, href: `/dashboard/work-instructions/${wi.id}` });
  }
  for (const item of equipment.data ?? []) {
    results.push({ type: "Equipment", label: item.name, href: `/dashboard/equipment/${item.id}` });
  }

  return results;
}
