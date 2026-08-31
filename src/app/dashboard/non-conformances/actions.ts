"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";

const VALID_STATUSES = ["open", "under_review", "disposition_agreed", "verified_closed"];
const VALID_DISPOSITIONS = ["scrap", "rework", "repair", "use_as_is", "return_to_vendor"];
const VALID_ROOT_CAUSE_CATEGORIES = [
  "machine_equipment",
  "method_sop",
  "material",
  "human_factor",
  "environment",
];
const VALID_REINSPECTION_OUTCOMES = ["pass", "fail"];

export async function createNonConformance(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const source = String(formData.get("source") || "internal_process");
  const dateReported = String(formData.get("dateReported") || "").trim();
  const reportedBy = String(formData.get("reportedBy") || "").trim();
  const department = String(formData.get("department") || "").trim();
  const itemOrProcess = String(formData.get("itemOrProcess") || "").trim();
  const lotOrSerial = String(formData.get("lotOrSerial") || "").trim();
  const quantityAffectedRaw = String(formData.get("quantityAffected") || "").trim();
  const assignedTo = String(formData.get("assignedTo") || "");
  const dueDate = String(formData.get("dueDate") || "");
  const relatedDocumentId = String(formData.get("relatedDocumentId") || "");
  const supplierId = String(formData.get("supplierId") || "");

  if (!title || !description) {
    redirect(
      `/dashboard/non-conformances/new?error=${encodeURIComponent(
        "Please fill in a title and description."
      )}`
    );
  }

  const quantityAffected = quantityAffectedRaw ? Number(quantityAffectedRaw) : null;
  if (quantityAffected !== null && (!Number.isFinite(quantityAffected) || quantityAffected < 0)) {
    redirect(
      `/dashboard/non-conformances/new?error=${encodeURIComponent(
        "Quantity affected must be a positive number."
      )}`
    );
  }

  const { data, error } = await supabase
    .from("non_conformances")
    .insert({
      company_id: profile.company_id,
      title,
      description,
      source,
      date_reported: dateReported || new Date().toISOString().slice(0, 10),
      reported_by: reportedBy || profile.full_name || null,
      department: department || null,
      item_or_process: itemOrProcess || null,
      lot_or_serial: lotOrSerial || null,
      quantity_affected: quantityAffected,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      related_document_id: relatedDocumentId || null,
      supplier_id: supplierId || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/dashboard/non-conformances/new?error=${encodeURIComponent(
        error?.message ?? "Could not create the non-conformance."
      )}`
    );
  }

  revalidatePath("/dashboard/non-conformances");
  redirect(`/dashboard/non-conformances/${data.id}`);
}

export async function updateNonConformance(ncId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const status = String(formData.get("status") || "open");
  const assignedTo = String(formData.get("assignedTo") || "");
  const dueDate = String(formData.get("dueDate") || "");

  const containmentAction = String(formData.get("containmentAction") || "").trim();
  const containmentResponsible = String(formData.get("containmentResponsible") || "").trim();
  const containmentDate = String(formData.get("containmentDate") || "");

  const disposition = String(formData.get("disposition") || "");
  const dispositionDetails = String(formData.get("dispositionDetails") || "").trim();
  const qmApprovalName = String(formData.get("qmApprovalName") || "").trim();
  const qmApprovalDate = String(formData.get("qmApprovalDate") || "");
  const engApprovalName = String(formData.get("engApprovalName") || "").trim();
  const engApprovalDate = String(formData.get("engApprovalDate") || "");

  const capaRequired = formData.get("capaRequired") === "on";
  const capaTrackingNumber = String(formData.get("capaTrackingNumber") || "").trim();

  const rootCauseCategory = String(formData.get("rootCauseCategory") || "");
  const rootCause = String(formData.get("rootCause") || "").trim();

  const verificationNotes = String(formData.get("verificationNotes") || "").trim();
  const reinspectionOutcome = String(formData.get("reinspectionOutcome") || "");
  const qaInspectorName = String(formData.get("qaInspectorName") || "").trim();
  const qaInspectorDate = String(formData.get("qaInspectorDate") || "");

  if (!VALID_STATUSES.includes(status)) {
    redirect(`/dashboard/non-conformances/${ncId}?error=${encodeURIComponent("Invalid status.")}`);
  }
  if (disposition && !VALID_DISPOSITIONS.includes(disposition)) {
    redirect(`/dashboard/non-conformances/${ncId}?error=${encodeURIComponent("Invalid disposition.")}`);
  }
  if (rootCauseCategory && !VALID_ROOT_CAUSE_CATEGORIES.includes(rootCauseCategory)) {
    redirect(
      `/dashboard/non-conformances/${ncId}?error=${encodeURIComponent("Invalid root cause category.")}`
    );
  }
  if (reinspectionOutcome && !VALID_REINSPECTION_OUTCOMES.includes(reinspectionOutcome)) {
    redirect(
      `/dashboard/non-conformances/${ncId}?error=${encodeURIComponent("Invalid re-inspection outcome.")}`
    );
  }

  // Only stamp closed_at the moment it actually transitions to Verified &
  // Closed, not every time an already-closed record is re-saved.
  const { data: existing } = await supabase
    .from("non_conformances")
    .select("status, closed_at")
    .eq("id", ncId)
    .single();

  let closedAt = existing?.closed_at ?? null;
  if (status === "verified_closed" && existing?.status !== "verified_closed") {
    closedAt = new Date().toISOString();
  } else if (status !== "verified_closed") {
    closedAt = null;
  }

  const { error } = await supabase
    .from("non_conformances")
    .update({
      status,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      containment_action: containmentAction || null,
      containment_responsible: containmentResponsible || null,
      containment_date: containmentDate || null,
      disposition: disposition || null,
      disposition_details: dispositionDetails || null,
      qm_approval_name: qmApprovalName || null,
      qm_approval_date: qmApprovalDate || null,
      eng_approval_name: engApprovalName || null,
      eng_approval_date: engApprovalDate || null,
      capa_required: capaRequired,
      capa_tracking_number: capaTrackingNumber || null,
      root_cause_category: rootCauseCategory || null,
      root_cause: rootCause || null,
      verification_notes: verificationNotes || null,
      reinspection_outcome: reinspectionOutcome || null,
      qa_inspector_name: qaInspectorName || null,
      qa_inspector_date: qaInspectorDate || null,
      closed_at: closedAt,
    })
    .eq("id", ncId);

  if (error) {
    redirect(`/dashboard/non-conformances/${ncId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/non-conformances/${ncId}`);
  revalidatePath("/dashboard/non-conformances");
  redirect(`/dashboard/non-conformances/${ncId}`);
}
