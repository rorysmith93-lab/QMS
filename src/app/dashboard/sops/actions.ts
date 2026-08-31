"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { canActOnCategory, getWorkflowMode } from "@/lib/document-authorization";
import { buildSopPdf } from "@/lib/pdf/build-sop-pdf";
import { syncGeneratedDocument } from "@/lib/generated-documents";

// SOPs don't get their own separate authorization system — they're gated
// by the same category-based matrix built for Document Control (see
// Dashboard → Authorization), reusing the existing 'procedure' category.
const SOP_CATEGORY = "procedure";

export async function createSop(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const documentNumber = String(formData.get("documentNumber") || "").trim();

  if (!title) {
    redirect(`/dashboard/sops/new?error=${encodeURIComponent("Please give it a title.")}`);
  }

  const { data, error } = await supabase
    .from("sops")
    .insert({
      company_id: profile.company_id,
      title,
      document_number: documentNumber || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/dashboard/sops/new?error=${encodeURIComponent(error?.message ?? "Could not create the SOP.")}`
    );
  }

  revalidatePath("/dashboard/sops");
  redirect(`/dashboard/sops/${data.id}`);
}

// Saves the title/doc number plus every fixed section in one go — this is
// what actually gives SOPs "controlled format": the same sections, every
// time, rather than a free-form file someone could structure however they
// like.
export async function updateSopMeta(sopId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const documentNumber = String(formData.get("documentNumber") || "").trim();
  const purpose = String(formData.get("purpose") || "").trim();
  const scope = String(formData.get("scope") || "").trim();
  const responsibilities = String(formData.get("responsibilities") || "").trim();
  const referenceNotes = String(formData.get("referenceNotes") || "").trim();

  if (!title) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent("Title can't be empty.")}`);
  }

  const { error } = await supabase
    .from("sops")
    .update({
      title,
      document_number: documentNumber || null,
      purpose: purpose || null,
      scope: scope || null,
      responsibilities: responsibilities || null,
      reference_notes: referenceNotes || null,
    })
    .eq("id", sopId);

  if (error) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/sops/${sopId}`);
  revalidatePath("/dashboard/sops");
  redirect(`/dashboard/sops/${sopId}`);
}

export async function addStep(sopId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const description = String(formData.get("description") || "").trim();
  const linkedWorkInstructionId = String(formData.get("linkedWorkInstructionId") || "").trim();

  if (!description) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent("Step description can't be empty.")}`);
  }

  const { data: existingSteps } = await supabase
    .from("sop_steps")
    .select("position")
    .eq("sop_id", sopId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (existingSteps?.[0]?.position ?? 0) + 1;

  const { data: step, error } = await supabase
    .from("sop_steps")
    .insert({
      sop_id: sopId,
      company_id: profile.company_id,
      position: nextPosition,
      description,
      linked_work_instruction_id: linkedWorkInstructionId || null,
    })
    .select("id")
    .single();

  if (error || !step) {
    redirect(
      `/dashboard/sops/${sopId}?error=${encodeURIComponent(error?.message ?? "Could not add the step.")}`
    );
  }

  revalidatePath(`/dashboard/sops/${sopId}`);
  redirect(`/dashboard/sops/${sopId}#step-${step.id}`);
}

export async function updateStep(stepId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const { data: currentStep } = await supabase
    .from("sop_steps")
    .select("sop_id")
    .eq("id", stepId)
    .single();

  if (!currentStep) {
    return;
  }

  const sopId = currentStep.sop_id;
  const description = String(formData.get("description") || "").trim();
  const linkedWorkInstructionId = String(formData.get("linkedWorkInstructionId") || "").trim();

  if (!description) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent("Step description can't be empty.")}`);
  }

  const { error } = await supabase
    .from("sop_steps")
    .update({
      description,
      linked_work_instruction_id: linkedWorkInstructionId || null,
    })
    .eq("id", stepId);

  if (error) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/sops/${sopId}`);
  redirect(`/dashboard/sops/${sopId}#step-${stepId}`);
}

export async function deleteStep(stepId: string) {
  const { supabase } = await requireProfile();

  const { data: step } = await supabase
    .from("sop_steps")
    .select("sop_id")
    .eq("id", stepId)
    .single();

  if (!step) {
    return;
  }

  await supabase.from("sop_steps").delete().eq("id", stepId);

  revalidatePath(`/dashboard/sops/${step.sop_id}`);
  redirect(`/dashboard/sops/${step.sop_id}`);
}

async function swapWithNeighbor(stepId: string, direction: "up" | "down") {
  const { supabase } = await requireProfile();

  const { data: step } = await supabase
    .from("sop_steps")
    .select("id, sop_id, position")
    .eq("id", stepId)
    .single();

  if (!step) return;

  let query = supabase.from("sop_steps").select("id, position").eq("sop_id", step.sop_id);

  query =
    direction === "up"
      ? query.lt("position", step.position).order("position", { ascending: false })
      : query.gt("position", step.position).order("position", { ascending: true });

  const { data: neighbor } = await query.limit(1).maybeSingle();

  if (neighbor) {
    await supabase.from("sop_steps").update({ position: step.position }).eq("id", neighbor.id);
    await supabase.from("sop_steps").update({ position: neighbor.position }).eq("id", step.id);
  }

  revalidatePath(`/dashboard/sops/${step.sop_id}`);
  redirect(`/dashboard/sops/${step.sop_id}#step-${stepId}`);
}

export async function moveStepUp(stepId: string) {
  await swapWithNeighbor(stepId, "up");
}

export async function moveStepDown(stepId: string) {
  await swapWithNeighbor(stepId, "down");
}

export async function checkSop(sopId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: sop } = await supabase.from("sops").select("status").eq("id", sopId).single();
  if (!sop) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent("SOP not found.")}`);
  }

  const mode = await getWorkflowMode(supabase, profile.company_id, SOP_CATEGORY);
  if (mode !== "check_and_approve") {
    redirect(
      `/dashboard/sops/${sopId}?error=${encodeURIComponent(
        "This category doesn't use a separate check step — it goes straight to Approve."
      )}`
    );
  }
  if (sop.status !== "draft") {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent("Only a draft can be marked as checked.")}`);
  }

  const allowed = await canActOnCategory(supabase, profile.company_id, SOP_CATEGORY, profile.id, "checker");
  if (!allowed) {
    redirect(
      `/dashboard/sops/${sopId}?error=${encodeURIComponent(
        "You're not authorized to check SOPs in this category — see Authorization."
      )}`
    );
  }

  const { error } = await supabase
    .from("sops")
    .update({ status: "checked", checked_by: profile.id, checked_at: new Date().toISOString() })
    .eq("id", sopId);

  if (error) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/sops/${sopId}`);
  redirect(`/dashboard/sops/${sopId}`);
}

export async function approveSop(sopId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: sop } = await supabase
    .from("sops")
    .select("title, document_number, status")
    .eq("id", sopId)
    .single();
  if (!sop) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent("SOP not found.")}`);
  }

  const { data: steps } = await supabase.from("sop_steps").select("id").eq("sop_id", sopId).limit(1);
  if (!steps || steps.length === 0) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent("Add at least one procedure step before approving.")}`);
  }

  const mode = await getWorkflowMode(supabase, profile.company_id, SOP_CATEGORY);
  if (mode === "check_and_approve" && sop.status !== "checked") {
    redirect(
      `/dashboard/sops/${sopId}?error=${encodeURIComponent("This category requires a check before it can be approved.")}`
    );
  }
  if (mode !== "check_and_approve" && sop.status !== "draft") {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent("Only a draft can be approved.")}`);
  }

  const allowed = await canActOnCategory(supabase, profile.company_id, SOP_CATEGORY, profile.id, "approver");
  if (!allowed) {
    redirect(
      `/dashboard/sops/${sopId}?error=${encodeURIComponent(
        "You're not authorized to approve SOPs in this category — see Authorization."
      )}`
    );
  }

  const { error } = await supabase
    .from("sops")
    .update({ status: "approved", approved_by: profile.id, approved_at: new Date().toISOString() })
    .eq("id", sopId);

  if (error) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent(error.message)}`);
  }

  // Also push a PDF of this approved content into Documents —
  // best-effort: a problem generating/uploading the PDF shouldn't undo the
  // approval that already succeeded above, so this is deliberately
  // swallowed rather than redirected as an error.
  try {
    const built = await buildSopPdf(supabase, sopId, profile.company_id, profile.companies?.logo_path ?? null);
    if (built) {
      await syncGeneratedDocument(supabase, {
        companyId: profile.company_id,
        sourceType: "sop",
        sourceId: sopId,
        title: sop.title,
        documentNumber: sop.document_number,
        pdfBuffer: built.buffer,
        fileName: built.filename,
        actorId: profile.id,
      });
    }
  } catch (pdfSyncError) {
    console.error("Could not sync SOP PDF into Documents:", pdfSyncError);
  }

  revalidatePath(`/dashboard/sops/${sopId}`);
  revalidatePath("/dashboard/sops");
  revalidatePath("/dashboard/documents");
  redirect(`/dashboard/sops/${sopId}`);
}

// Unrestricted, same reasoning as Documents'/Work Instructions'
// returnToDraft — this is "someone caught an issue before final approval",
// not an authoring act, so anyone in the company can flag it.
export async function returnSopToDraft(sopId: string) {
  const { supabase } = await requireProfile();

  const { error } = await supabase
    .from("sops")
    .update({ status: "draft", checked_by: null, checked_at: null, approved_by: null, approved_at: null })
    .eq("id", sopId);

  if (error) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/sops/${sopId}`);
  redirect(`/dashboard/sops/${sopId}`);
}

// The equivalent of Documents' "Create revision" — since a SOP has no file
// to copy, what needs preserving is the currently-approved WORDING, before
// the live rows get reopened for editing. So this snapshots the current
// title/sections/steps into an immutable sop_versions row first, THEN
// flips status back to draft — the live sops/sop_steps rows are left
// exactly as they were (still showing the approved wording) as the
// starting point for whatever gets edited next.
export async function reviseSop(sopId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: sop } = await supabase
    .from("sops")
    .select("title, document_number, purpose, scope, responsibilities, reference_notes, status, approved_by, approved_at")
    .eq("id", sopId)
    .single();

  if (!sop) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent("SOP not found.")}`);
  }
  if (sop.status !== "approved") {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent("Only an approved SOP can be revised this way.")}`);
  }

  const allowed = await canActOnCategory(supabase, profile.company_id, SOP_CATEGORY, profile.id, "author");
  if (!allowed) {
    redirect(
      `/dashboard/sops/${sopId}?error=${encodeURIComponent(
        "You're not authorized to revise SOPs in this category — see Authorization."
      )}`
    );
  }

  const { data: steps } = await supabase
    .from("sop_steps")
    .select("position, description, linked_work_instruction_id, work_instructions(title, document_number)")
    .eq("sop_id", sopId)
    .order("position", { ascending: true });

  const stepSnapshot = (steps ?? []).map((step) => {
    const wi = step.work_instructions as unknown as { title: string; document_number: string | null } | null;
    return {
      position: step.position,
      description: step.description,
      linked_work_instruction_id: step.linked_work_instruction_id,
      linked_work_instruction_title: wi
        ? wi.document_number
          ? `${wi.document_number} — ${wi.title}`
          : wi.title
        : null,
    };
  });

  const { data: existingVersions } = await supabase
    .from("sop_versions")
    .select("version_number")
    .eq("sop_id", sopId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersionNumber = (existingVersions?.[0]?.version_number ?? 0) + 1;

  const { error: versionError } = await supabase.from("sop_versions").insert({
    sop_id: sopId,
    company_id: profile.company_id,
    version_number: nextVersionNumber,
    title: sop.title,
    document_number: sop.document_number,
    purpose: sop.purpose,
    scope: sop.scope,
    responsibilities: sop.responsibilities,
    reference_notes: sop.reference_notes,
    steps: stepSnapshot,
    approved_by: sop.approved_by,
    approved_at: sop.approved_at,
    snapshotted_by: profile.id,
  });

  if (versionError) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent(versionError.message)}`);
  }

  const { error } = await supabase
    .from("sops")
    .update({ status: "draft", checked_by: null, checked_at: null, approved_by: null, approved_at: null })
    .eq("id", sopId);

  if (error) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/sops/${sopId}`);
  revalidatePath("/dashboard/sops");
  redirect(`/dashboard/sops/${sopId}`);
}

export async function archiveSop(sopId: string) {
  const { profile, supabase } = await requireProfile();

  const allowed = await canActOnCategory(supabase, profile.company_id, SOP_CATEGORY, profile.id, "approver");
  if (!allowed) {
    redirect(
      `/dashboard/sops/${sopId}?error=${encodeURIComponent(
        "You're not authorized to archive SOPs in this category — see Authorization."
      )}`
    );
  }

  const { error } = await supabase.from("sops").update({ status: "archived" }).eq("id", sopId);

  if (error) {
    redirect(`/dashboard/sops/${sopId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/sops/${sopId}`);
  revalidatePath("/dashboard/sops");
  redirect(`/dashboard/sops/${sopId}`);
}
