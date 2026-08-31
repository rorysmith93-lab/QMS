"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { canAccess } from "@/lib/roles";
import { CHANGE_STATUSES } from "@/lib/change-control";

const VALID_STATUSES = CHANGE_STATUSES.map((s) => s.value);

// Replaces a change request's link set for one related table — delete
// everything currently linked, then re-insert whatever was submitted.
// Same pattern as work instructions' equipment set (see
// src/app/dashboard/work-instructions/actions.ts): simpler and safer
// than diffing, and these lists are always small.
async function syncLinks(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  table: string,
  fkColumn: string,
  changeRequestId: string,
  companyId: string,
  ids: string[]
) {
  await supabase.from(table).delete().eq("change_request_id", changeRequestId);
  if (ids.length > 0) {
    await supabase.from(table).insert(
      ids.map((id) => ({
        change_request_id: changeRequestId,
        [fkColumn]: id,
        company_id: companyId,
      }))
    );
  }
}

function readLinkIds(formData: FormData) {
  return {
    documentIds: formData.getAll("documentIds").map(String),
    sopIds: formData.getAll("sopIds").map(String),
    workInstructionIds: formData.getAll("workInstructionIds").map(String),
    ncrIds: formData.getAll("ncrIds").map(String),
  };
}

export async function createChangeRequest(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "changeControl")) {
    redirect(`/dashboard/change-control?error=${encodeURIComponent("Your role can't raise change requests.")}`);
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const impactAssessment = String(formData.get("impactAssessment") || "").trim();
  const owner = String(formData.get("owner") || "");
  const targetDate = String(formData.get("targetDate") || "");

  if (!title) {
    redirect(`/dashboard/change-control?error=${encodeURIComponent("Please give it a title.")}`);
  }

  const { data: created, error } = await supabase
    .from("change_requests")
    .insert({
      company_id: profile.company_id,
      title,
      description: description || null,
      impact_assessment: impactAssessment || null,
      owner: owner || null,
      target_date: targetDate || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    redirect(`/dashboard/change-control?error=${encodeURIComponent(error?.message ?? "Something went wrong.")}`);
  }

  const { documentIds, sopIds, workInstructionIds, ncrIds } = readLinkIds(formData);
  await Promise.all([
    syncLinks(supabase, "change_request_documents", "document_id", created.id, profile.company_id, documentIds),
    syncLinks(supabase, "change_request_sops", "sop_id", created.id, profile.company_id, sopIds),
    syncLinks(
      supabase,
      "change_request_work_instructions",
      "work_instruction_id",
      created.id,
      profile.company_id,
      workInstructionIds
    ),
    syncLinks(supabase, "change_request_ncrs", "non_conformance_id", created.id, profile.company_id, ncrIds),
  ]);

  revalidatePath("/dashboard/change-control");
  redirect("/dashboard/change-control");
}

export async function updateChangeRequest(changeRequestId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "changeControl")) {
    redirect(`/dashboard/change-control?error=${encodeURIComponent("Your role can't edit change requests.")}`);
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const impactAssessment = String(formData.get("impactAssessment") || "").trim();
  const owner = String(formData.get("owner") || "");
  const targetDate = String(formData.get("targetDate") || "");
  const status = String(formData.get("status") || "proposed");

  if (!title) {
    redirect(`/dashboard/change-control?error=${encodeURIComponent("Please give it a title.")}`);
  }
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    redirect(`/dashboard/change-control?error=${encodeURIComponent("Invalid status.")}`);
  }

  // Fetch the current row first so moving into "approved" or "implemented"
  // only stamps who/when the first time it happens, not on every save.
  const { data: existing } = await supabase
    .from("change_requests")
    .select("status, approved_by, approved_at, implemented_at")
    .eq("id", changeRequestId)
    .single();

  const update: Record<string, unknown> = {
    title,
    description: description || null,
    impact_assessment: impactAssessment || null,
    owner: owner || null,
    target_date: targetDate || null,
    status,
  };

  if (status === "approved" && existing && !existing.approved_at) {
    update.approved_by = profile.id;
    update.approved_at = new Date().toISOString();
  }
  if (status === "implemented" && existing && !existing.implemented_at) {
    update.implemented_at = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("change_requests").update(update).eq("id", changeRequestId);

  if (error) {
    redirect(`/dashboard/change-control?error=${encodeURIComponent(error.message)}`);
  }

  const { documentIds, sopIds, workInstructionIds, ncrIds } = readLinkIds(formData);
  await Promise.all([
    syncLinks(supabase, "change_request_documents", "document_id", changeRequestId, profile.company_id, documentIds),
    syncLinks(supabase, "change_request_sops", "sop_id", changeRequestId, profile.company_id, sopIds),
    syncLinks(
      supabase,
      "change_request_work_instructions",
      "work_instruction_id",
      changeRequestId,
      profile.company_id,
      workInstructionIds
    ),
    syncLinks(supabase, "change_request_ncrs", "non_conformance_id", changeRequestId, profile.company_id, ncrIds),
  ]);

  revalidatePath("/dashboard/change-control");
  redirect("/dashboard/change-control");
}
