"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";

const VALID_AUDIT_STATUSES = ["planned", "in_progress", "completed", "closed"];
const VALID_FINDING_TYPES = ["nonconformity", "observation", "opportunity_for_improvement"];

export async function createAudit(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const processArea = String(formData.get("processArea") || "").trim();
  const clauseReference = String(formData.get("clauseReference") || "").trim();
  const leadAuditor = String(formData.get("leadAuditor") || "").trim();
  const plannedDate = String(formData.get("plannedDate") || "").trim();
  const scope = String(formData.get("scope") || "").trim();

  if (!title) {
    redirect(
      `/dashboard/internal-audits/new?error=${encodeURIComponent("Please give the audit a title.")}`
    );
  }

  const { data, error } = await supabase
    .from("internal_audits")
    .insert({
      company_id: profile.company_id,
      title,
      process_area: processArea || null,
      clause_reference: clauseReference || null,
      lead_auditor: leadAuditor || profile.full_name || null,
      planned_date: plannedDate || new Date().toISOString().slice(0, 10),
      scope: scope || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/dashboard/internal-audits/new?error=${encodeURIComponent(
        error?.message ?? "Could not schedule the audit."
      )}`
    );
  }

  revalidatePath("/dashboard/internal-audits");
  redirect(`/dashboard/internal-audits/${data.id}`);
}

export async function updateAudit(auditId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const status = String(formData.get("status") || "planned");
  const actualDate = String(formData.get("actualDate") || "");
  const scope = String(formData.get("scope") || "").trim();
  const summary = String(formData.get("summary") || "").trim();

  if (!VALID_AUDIT_STATUSES.includes(status)) {
    redirect(`/dashboard/internal-audits/${auditId}?error=${encodeURIComponent("Invalid status.")}`);
  }

  const { error } = await supabase
    .from("internal_audits")
    .update({
      status,
      actual_date: actualDate || null,
      scope: scope || null,
      summary: summary || null,
    })
    .eq("id", auditId);

  if (error) {
    redirect(`/dashboard/internal-audits/${auditId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/internal-audits/${auditId}`);
  revalidatePath("/dashboard/internal-audits");
  redirect(`/dashboard/internal-audits/${auditId}`);
}

export async function addFinding(auditId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const findingType = String(formData.get("findingType") || "observation");
  const clauseReference = String(formData.get("clauseReference") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const evidence = String(formData.get("evidence") || "").trim();
  const correctiveActionRequired = formData.get("correctiveActionRequired") === "on";

  if (!VALID_FINDING_TYPES.includes(findingType)) {
    redirect(`/dashboard/internal-audits/${auditId}?error=${encodeURIComponent("Invalid finding type.")}`);
  }
  if (!description) {
    redirect(
      `/dashboard/internal-audits/${auditId}?error=${encodeURIComponent("Please describe the finding.")}`
    );
  }

  const { error } = await supabase.from("audit_findings").insert({
    company_id: profile.company_id,
    audit_id: auditId,
    finding_type: findingType,
    clause_reference: clauseReference || null,
    description,
    evidence: evidence || null,
    corrective_action_required: correctiveActionRequired,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/internal-audits/${auditId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/internal-audits/${auditId}`);
  redirect(`/dashboard/internal-audits/${auditId}`);
}

export async function toggleFindingStatus(auditId: string, findingId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const nextStatus = String(formData.get("nextStatus") || "open");

  const { error } = await supabase
    .from("audit_findings")
    .update({
      status: nextStatus,
      closed_date: nextStatus === "closed" ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", findingId);

  if (error) {
    redirect(`/dashboard/internal-audits/${auditId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/internal-audits/${auditId}`);
  redirect(`/dashboard/internal-audits/${auditId}`);
}

// Spins a finding straight into the existing NCR/CAPA workflow instead of
// duplicating containment/disposition/root-cause fields here — the finding
// just gets linked to whatever NCR number comes out of it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature must accept the form's FormData to be usable as a <form action>
export async function createNcrFromFinding(auditId: string, findingId: string, _formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const [{ data: finding }, { data: audit }] = await Promise.all([
    supabase
      .from("audit_findings")
      .select("description, clause_reference, finding_type")
      .eq("id", findingId)
      .single(),
    supabase.from("internal_audits").select("audit_number, process_area").eq("id", auditId).single(),
  ]);

  if (!finding) {
    redirect(`/dashboard/internal-audits/${auditId}?error=${encodeURIComponent("Finding not found.")}`);
  }

  const { data: ncr, error } = await supabase
    .from("non_conformances")
    .insert({
      company_id: profile.company_id,
      title: `Audit finding (${audit?.audit_number ?? "internal audit"}): ${finding.description.slice(0, 80)}`,
      description: finding.description,
      source: "internal_audit",
      date_reported: new Date().toISOString().slice(0, 10),
      reported_by: profile.full_name || null,
      department: audit?.process_area || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !ncr) {
    redirect(
      `/dashboard/internal-audits/${auditId}?error=${encodeURIComponent(
        error?.message ?? "Could not create the NCR."
      )}`
    );
  }

  await supabase.from("audit_findings").update({ linked_ncr_id: ncr.id }).eq("id", findingId);

  revalidatePath(`/dashboard/internal-audits/${auditId}`);
  redirect(`/dashboard/non-conformances/${ncr.id}`);
}
