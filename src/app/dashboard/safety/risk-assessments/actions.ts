"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { canActOnSafetyCategory, getSafetyWorkflowMode } from "@/lib/safety-document-authorization";
import { buildRiskAssessmentPdf } from "@/lib/pdf/build-risk-assessment-pdf";
import { syncSafetyGeneratedDocument } from "@/lib/safety-generated-documents";

const BASE_PATH = "/dashboard/safety/risk-assessments";

// Risk Assessments don't get their own authorization system — same as
// SOPs reusing QMS Documents' 'procedure' category, this reuses the
// existing Safety Documents matrix under its existing 'risk_assessment'
// category (Dashboard → Safety → Safety Documents → Authorization).
const RA_CATEGORY = "risk_assessment";

function clampLevel(raw: FormDataEntryValue | null, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export async function createRiskAssessment(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const documentNumber = String(formData.get("documentNumber") || "").trim();
  const areaOrProcess = String(formData.get("areaOrProcess") || "").trim();
  const assessor = String(formData.get("assessor") || "").trim();
  const reviewDueDate = String(formData.get("reviewDueDate") || "");

  if (!title) {
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent("Please give it a title.")}`);
  }

  const { data, error } = await supabase
    .from("risk_assessments")
    .insert({
      company_id: profile.company_id,
      title,
      document_number: documentNumber || null,
      area_or_process: areaOrProcess || null,
      assessor: assessor || profile.full_name || null,
      review_due_date: reviewDueDate || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `${BASE_PATH}/new?error=${encodeURIComponent(error?.message ?? "Could not create the risk assessment.")}`
    );
  }

  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${data.id}`);
}

export async function updateRiskAssessmentMeta(riskAssessmentId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const documentNumber = String(formData.get("documentNumber") || "").trim();
  const areaOrProcess = String(formData.get("areaOrProcess") || "").trim();
  const assessor = String(formData.get("assessor") || "").trim();
  const assessmentDate = String(formData.get("assessmentDate") || "");
  const reviewDueDate = String(formData.get("reviewDueDate") || "");

  if (!title) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("Title can't be empty.")}`);
  }

  const { error } = await supabase
    .from("risk_assessments")
    .update({
      title,
      document_number: documentNumber || null,
      area_or_process: areaOrProcess || null,
      assessor: assessor || null,
      assessment_date: assessmentDate || null,
      review_due_date: reviewDueDate || null,
    })
    .eq("id", riskAssessmentId);

  if (error) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${riskAssessmentId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${riskAssessmentId}`);
}

export async function addHazard(riskAssessmentId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const hazardDescription = String(formData.get("hazardDescription") || "").trim();
  const whoMightBeHarmed = String(formData.get("whoMightBeHarmed") || "").trim();
  const existingControls = String(formData.get("existingControls") || "").trim();
  const additionalControls = String(formData.get("additionalControls") || "").trim();
  const initialLikelihood = clampLevel(formData.get("initialLikelihood"), 3);
  const initialSeverity = clampLevel(formData.get("initialSeverity"), 3);
  const residualLikelihood = clampLevel(formData.get("residualLikelihood"), 1);
  const residualSeverity = clampLevel(formData.get("residualSeverity"), 1);

  if (!hazardDescription) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("Hazard description can't be empty.")}`);
  }

  const { data: existingHazards } = await supabase
    .from("risk_assessment_hazards")
    .select("position")
    .eq("risk_assessment_id", riskAssessmentId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (existingHazards?.[0]?.position ?? 0) + 1;

  const { data: hazard, error } = await supabase
    .from("risk_assessment_hazards")
    .insert({
      risk_assessment_id: riskAssessmentId,
      company_id: profile.company_id,
      position: nextPosition,
      hazard_description: hazardDescription,
      who_might_be_harmed: whoMightBeHarmed || null,
      existing_controls: existingControls || null,
      additional_controls: additionalControls || null,
      initial_likelihood: initialLikelihood,
      initial_severity: initialSeverity,
      residual_likelihood: residualLikelihood,
      residual_severity: residualSeverity,
    })
    .select("id")
    .single();

  if (error || !hazard) {
    redirect(
      `${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(error?.message ?? "Could not add the hazard.")}`
    );
  }

  revalidatePath(`${BASE_PATH}/${riskAssessmentId}`);
  redirect(`${BASE_PATH}/${riskAssessmentId}#hazard-${hazard.id}`);
}

export async function updateHazard(hazardId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const { data: currentHazard } = await supabase
    .from("risk_assessment_hazards")
    .select("risk_assessment_id")
    .eq("id", hazardId)
    .single();

  if (!currentHazard) {
    return;
  }

  const riskAssessmentId = currentHazard.risk_assessment_id;
  const hazardDescription = String(formData.get("hazardDescription") || "").trim();
  const whoMightBeHarmed = String(formData.get("whoMightBeHarmed") || "").trim();
  const existingControls = String(formData.get("existingControls") || "").trim();
  const additionalControls = String(formData.get("additionalControls") || "").trim();
  const initialLikelihood = clampLevel(formData.get("initialLikelihood"), 3);
  const initialSeverity = clampLevel(formData.get("initialSeverity"), 3);
  const residualLikelihood = clampLevel(formData.get("residualLikelihood"), 1);
  const residualSeverity = clampLevel(formData.get("residualSeverity"), 1);

  if (!hazardDescription) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("Hazard description can't be empty.")}`);
  }

  const { error } = await supabase
    .from("risk_assessment_hazards")
    .update({
      hazard_description: hazardDescription,
      who_might_be_harmed: whoMightBeHarmed || null,
      existing_controls: existingControls || null,
      additional_controls: additionalControls || null,
      initial_likelihood: initialLikelihood,
      initial_severity: initialSeverity,
      residual_likelihood: residualLikelihood,
      residual_severity: residualSeverity,
    })
    .eq("id", hazardId);

  if (error) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${riskAssessmentId}`);
  redirect(`${BASE_PATH}/${riskAssessmentId}#hazard-${hazardId}`);
}

export async function deleteHazard(hazardId: string) {
  const { supabase } = await requireProfile();

  const { data: hazard } = await supabase
    .from("risk_assessment_hazards")
    .select("risk_assessment_id")
    .eq("id", hazardId)
    .single();

  if (!hazard) {
    return;
  }

  await supabase.from("risk_assessment_hazards").delete().eq("id", hazardId);

  revalidatePath(`${BASE_PATH}/${hazard.risk_assessment_id}`);
  redirect(`${BASE_PATH}/${hazard.risk_assessment_id}`);
}

async function swapWithNeighbor(hazardId: string, direction: "up" | "down") {
  const { supabase } = await requireProfile();

  const { data: hazard } = await supabase
    .from("risk_assessment_hazards")
    .select("id, risk_assessment_id, position")
    .eq("id", hazardId)
    .single();

  if (!hazard) return;

  let query = supabase
    .from("risk_assessment_hazards")
    .select("id, position")
    .eq("risk_assessment_id", hazard.risk_assessment_id);

  query =
    direction === "up"
      ? query.lt("position", hazard.position).order("position", { ascending: false })
      : query.gt("position", hazard.position).order("position", { ascending: true });

  const { data: neighbor } = await query.limit(1).maybeSingle();

  if (neighbor) {
    await supabase.from("risk_assessment_hazards").update({ position: hazard.position }).eq("id", neighbor.id);
    await supabase.from("risk_assessment_hazards").update({ position: neighbor.position }).eq("id", hazard.id);
  }

  revalidatePath(`${BASE_PATH}/${hazard.risk_assessment_id}`);
  redirect(`${BASE_PATH}/${hazard.risk_assessment_id}#hazard-${hazardId}`);
}

export async function moveHazardUp(hazardId: string) {
  await swapWithNeighbor(hazardId, "up");
}

export async function moveHazardDown(hazardId: string) {
  await swapWithNeighbor(hazardId, "down");
}

export async function checkRiskAssessment(riskAssessmentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: ra } = await supabase.from("risk_assessments").select("status").eq("id", riskAssessmentId).single();
  if (!ra) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("Risk assessment not found.")}`);
  }

  const mode = await getSafetyWorkflowMode(supabase, profile.company_id, RA_CATEGORY);
  if (mode !== "check_and_approve") {
    redirect(
      `${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(
        "This category doesn't use a separate check step — it goes straight to Approve."
      )}`
    );
  }
  if (ra.status !== "draft") {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("Only a draft can be marked as checked.")}`);
  }

  const allowed = await canActOnSafetyCategory(supabase, profile.company_id, RA_CATEGORY, profile.id, "checker");
  if (!allowed) {
    redirect(
      `${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(
        "You're not authorized to check risk assessments — see Authorization."
      )}`
    );
  }

  const { error } = await supabase
    .from("risk_assessments")
    .update({ status: "checked", checked_by: profile.id, checked_at: new Date().toISOString() })
    .eq("id", riskAssessmentId);

  if (error) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${riskAssessmentId}`);
  redirect(`${BASE_PATH}/${riskAssessmentId}`);
}

export async function approveRiskAssessment(riskAssessmentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: ra } = await supabase
    .from("risk_assessments")
    .select("title, document_number, status")
    .eq("id", riskAssessmentId)
    .single();
  if (!ra) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("Risk assessment not found.")}`);
  }

  const { data: hazards } = await supabase
    .from("risk_assessment_hazards")
    .select("id")
    .eq("risk_assessment_id", riskAssessmentId)
    .limit(1);
  if (!hazards || hazards.length === 0) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("Add at least one hazard before approving.")}`);
  }

  const mode = await getSafetyWorkflowMode(supabase, profile.company_id, RA_CATEGORY);
  if (mode === "check_and_approve" && ra.status !== "checked") {
    redirect(
      `${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("This category requires a check before it can be approved.")}`
    );
  }
  if (mode !== "check_and_approve" && ra.status !== "draft") {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("Only a draft can be approved.")}`);
  }

  const allowed = await canActOnSafetyCategory(supabase, profile.company_id, RA_CATEGORY, profile.id, "approver");
  if (!allowed) {
    redirect(
      `${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(
        "You're not authorized to approve risk assessments — see Authorization."
      )}`
    );
  }

  const { error } = await supabase
    .from("risk_assessments")
    .update({ status: "approved", approved_by: profile.id, approved_at: new Date().toISOString() })
    .eq("id", riskAssessmentId);

  if (error) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(error.message)}`);
  }

  // Best-effort, same reasoning as approveSop: a PDF/sync failure must
  // never undo the approval that already committed above.
  try {
    const built = await buildRiskAssessmentPdf(
      supabase,
      riskAssessmentId,
      profile.company_id,
      profile.companies?.logo_path ?? null
    );
    if (built) {
      await syncSafetyGeneratedDocument(supabase, {
        companyId: profile.company_id,
        sourceType: "risk_assessment",
        sourceId: riskAssessmentId,
        title: ra.title,
        documentNumber: ra.document_number,
        pdfBuffer: built.buffer,
        fileName: built.filename,
        actorId: profile.id,
      });
    }
  } catch (pdfSyncError) {
    console.error("Could not sync Risk Assessment PDF into Safety Documents:", pdfSyncError);
  }

  revalidatePath(`${BASE_PATH}/${riskAssessmentId}`);
  revalidatePath(BASE_PATH);
  revalidatePath("/dashboard/safety/documents");
  redirect(`${BASE_PATH}/${riskAssessmentId}`);
}

// Unrestricted, same reasoning as SOPs'/Documents' returnToDraft.
export async function returnRiskAssessmentToDraft(riskAssessmentId: string) {
  const { supabase } = await requireProfile();

  const { error } = await supabase
    .from("risk_assessments")
    .update({ status: "draft", checked_by: null, checked_at: null, approved_by: null, approved_at: null })
    .eq("id", riskAssessmentId);

  if (error) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${riskAssessmentId}`);
  redirect(`${BASE_PATH}/${riskAssessmentId}`);
}

// Same "snapshot the approved wording, then reopen as draft" pattern as
// reviseSop — see sops/actions.ts for the full reasoning.
export async function reviseRiskAssessment(riskAssessmentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: ra } = await supabase
    .from("risk_assessments")
    .select("title, document_number, area_or_process, assessor, assessment_date, status, approved_by, approved_at")
    .eq("id", riskAssessmentId)
    .single();

  if (!ra) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("Risk assessment not found.")}`);
  }
  if (ra.status !== "approved") {
    redirect(
      `${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent("Only an approved risk assessment can be revised this way.")}`
    );
  }

  const allowed = await canActOnSafetyCategory(supabase, profile.company_id, RA_CATEGORY, profile.id, "author");
  if (!allowed) {
    redirect(
      `${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(
        "You're not authorized to revise risk assessments — see Authorization."
      )}`
    );
  }

  const { data: hazardRows } = await supabase
    .from("risk_assessment_hazards")
    .select(
      "position, hazard_description, who_might_be_harmed, existing_controls, initial_likelihood, initial_severity, initial_score, additional_controls, residual_likelihood, residual_severity, residual_score"
    )
    .eq("risk_assessment_id", riskAssessmentId)
    .order("position", { ascending: true });

  const { data: existingVersions } = await supabase
    .from("risk_assessment_versions")
    .select("version_number")
    .eq("risk_assessment_id", riskAssessmentId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersionNumber = (existingVersions?.[0]?.version_number ?? 0) + 1;

  const { error: versionError } = await supabase.from("risk_assessment_versions").insert({
    risk_assessment_id: riskAssessmentId,
    company_id: profile.company_id,
    version_number: nextVersionNumber,
    title: ra.title,
    document_number: ra.document_number,
    area_or_process: ra.area_or_process,
    assessor: ra.assessor,
    assessment_date: ra.assessment_date,
    hazards: hazardRows ?? [],
    approved_by: ra.approved_by,
    approved_at: ra.approved_at,
    snapshotted_by: profile.id,
  });

  if (versionError) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(versionError.message)}`);
  }

  const { error } = await supabase
    .from("risk_assessments")
    .update({ status: "draft", checked_by: null, checked_at: null, approved_by: null, approved_at: null })
    .eq("id", riskAssessmentId);

  if (error) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${riskAssessmentId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${riskAssessmentId}`);
}

export async function archiveRiskAssessment(riskAssessmentId: string) {
  const { profile, supabase } = await requireProfile();

  const allowed = await canActOnSafetyCategory(supabase, profile.company_id, RA_CATEGORY, profile.id, "approver");
  if (!allowed) {
    redirect(
      `${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(
        "You're not authorized to archive risk assessments — see Authorization."
      )}`
    );
  }

  const { error } = await supabase.from("risk_assessments").update({ status: "archived" }).eq("id", riskAssessmentId);

  if (error) {
    redirect(`${BASE_PATH}/${riskAssessmentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${riskAssessmentId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${riskAssessmentId}`);
}
