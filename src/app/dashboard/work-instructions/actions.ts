"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { sanitizeFileName } from "@/lib/files";
import { isPpeKey } from "@/lib/ppe";
import { canActOnCategory, getWorkflowMode } from "@/lib/document-authorization";
import { buildWorkInstructionVersionPdf } from "@/lib/pdf/build-work-instruction-version-pdf";
import { syncGeneratedDocument } from "@/lib/generated-documents";
import { notifyTeamOfApproval } from "@/lib/notify";

const IMAGE_BUCKET = "work-instruction-images";
const EQUIPMENT_BUCKET = "equipment-images";

// Work instructions don't get their own separate authorization system —
// they're gated by the same category-based matrix built for Document
// Control (see Dashboard → Authorization). 'work_instruction' was already
// one of the five categories there.
const WI_CATEGORY = "work_instruction";

export async function createWorkInstruction(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const documentNumber = String(formData.get("documentNumber") || "").trim();

  if (!title) {
    redirect(
      `/dashboard/work-instructions/new?error=${encodeURIComponent("Please give it a title.")}`
    );
  }

  const { data, error } = await supabase
    .from("work_instructions")
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
      `/dashboard/work-instructions/new?error=${encodeURIComponent(
        error?.message ?? "Could not create the work instruction."
      )}`
    );
  }

  revalidatePath("/dashboard/work-instructions");
  redirect(`/dashboard/work-instructions/${data.id}`);
}

export async function updateWorkInstructionMeta(wiId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const documentNumber = String(formData.get("documentNumber") || "").trim();
  const font = String(formData.get("font") || "sans");

  if (!title) {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent("Title can't be empty.")}`
    );
  }
  if (!["sans", "serif", "mono"].includes(font)) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent("Invalid font.")}`);
  }

  // Status no longer changes via this free-form field — see
  // checkWorkInstruction/publishWorkInstruction/archiveWorkInstruction/
  // reviseWorkInstruction/returnWorkInstructionToDraft below, each gated
  // by the authorization matrix rather than settable by anyone.
  const { error } = await supabase
    .from("work_instructions")
    .update({ title, document_number: documentNumber || null, font })
    .eq("id", wiId);

  if (error) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/work-instructions/${wiId}`);
  revalidatePath("/dashboard/work-instructions");
  redirect(`/dashboard/work-instructions/${wiId}`);
}

// Saves both the "Required PPE" and "Required Equipment" pickers on the
// builder page in one go.
export async function updateRequirements(wiId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const ppeItems = formData
    .getAll("ppe")
    .map(String)
    .filter(isPpeKey);
  const equipmentIds = formData.getAll("equipment").map(String);

  const { error } = await supabase
    .from("work_instructions")
    .update({ ppe_items: ppeItems })
    .eq("id", wiId);

  if (error) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(error.message)}`);
  }

  // Simplest way to keep the join table in sync with the checkboxes:
  // clear this work instruction's equipment list, then re-add whatever's
  // now checked.
  await supabase.from("work_instruction_equipment").delete().eq("work_instruction_id", wiId);

  if (equipmentIds.length > 0) {
    await supabase.from("work_instruction_equipment").insert(
      equipmentIds.map((equipmentItemId) => ({
        work_instruction_id: wiId,
        equipment_item_id: equipmentItemId,
        company_id: profile.company_id,
      }))
    );
  }

  revalidatePath(`/dashboard/work-instructions/${wiId}`);
  redirect(`/dashboard/work-instructions/${wiId}`);
}

export async function addStep(wiId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const caution = String(formData.get("caution") || "").trim();
  const image = formData.get("image") as File | null;

  const { data: existingSteps } = await supabase
    .from("work_instruction_steps")
    .select("position")
    .eq("work_instruction_id", wiId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (existingSteps?.[0]?.position ?? 0) + 1;

  const { data: step, error } = await supabase
    .from("work_instruction_steps")
    .insert({
      work_instruction_id: wiId,
      company_id: profile.company_id,
      position: nextPosition,
      title: title || null,
      body: body || null,
      caution: caution || null,
    })
    .select("id")
    .single();

  if (error || !step) {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        error?.message ?? "Could not add the step."
      )}`
    );
  }

  if (image && image.size > 0) {
    const path = `${profile.company_id}/${wiId}/${step.id}-${Date.now()}-${sanitizeFileName(
      image.name
    )}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, image, { contentType: image.type || undefined });

    if (!uploadError) {
      await supabase.from("work_instruction_steps").update({ image_path: path }).eq("id", step.id);
    }
  }

  revalidatePath(`/dashboard/work-instructions/${wiId}`);
  redirect(`/dashboard/work-instructions/${wiId}#step-${step.id}`);
}

export async function updateStep(stepId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const { data: currentStep } = await supabase
    .from("work_instruction_steps")
    .select("work_instruction_id, image_path")
    .eq("id", stepId)
    .single();

  if (!currentStep) {
    return;
  }

  const wiId = currentStep.work_instruction_id;
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const caution = String(formData.get("caution") || "").trim();
  const image = formData.get("image") as File | null;
  const removeImage = formData.get("removeImage") === "on";

  let imagePath = currentStep.image_path;

  if (image && image.size > 0) {
    const path = `${profile.company_id}/${wiId}/${stepId}-${Date.now()}-${sanitizeFileName(
      image.name
    )}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, image, { contentType: image.type || undefined });

    if (uploadError) {
      redirect(
        `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(uploadError.message)}`
      );
    }

    if (currentStep.image_path) {
      await supabase.storage.from(IMAGE_BUCKET).remove([currentStep.image_path]);
    }
    imagePath = path;
  } else if (removeImage && currentStep.image_path) {
    await supabase.storage.from(IMAGE_BUCKET).remove([currentStep.image_path]);
    imagePath = null;
  }

  const { error } = await supabase
    .from("work_instruction_steps")
    .update({
      title: title || null,
      body: body || null,
      caution: caution || null,
      image_path: imagePath,
    })
    .eq("id", stepId);

  if (error) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/work-instructions/${wiId}`);
  redirect(`/dashboard/work-instructions/${wiId}#step-${stepId}`);
}

export async function deleteStep(stepId: string) {
  const { supabase } = await requireProfile();

  const { data: step } = await supabase
    .from("work_instruction_steps")
    .select("work_instruction_id, image_path")
    .eq("id", stepId)
    .single();

  if (!step) {
    return;
  }

  await supabase.from("work_instruction_steps").delete().eq("id", stepId);

  if (step.image_path) {
    await supabase.storage.from(IMAGE_BUCKET).remove([step.image_path]);
  }

  revalidatePath(`/dashboard/work-instructions/${step.work_instruction_id}`);
  redirect(`/dashboard/work-instructions/${step.work_instruction_id}`);
}

async function swapWithNeighbor(stepId: string, direction: "up" | "down") {
  const { supabase } = await requireProfile();

  const { data: step } = await supabase
    .from("work_instruction_steps")
    .select("id, work_instruction_id, position")
    .eq("id", stepId)
    .single();

  if (!step) return;

  // "Up" means swap with the closest step ABOVE (next lower position) —
  // so sort those descending and take the first (closest) one. "Down" is
  // the mirror image: closest step below, sorted ascending.
  let query = supabase
    .from("work_instruction_steps")
    .select("id, position")
    .eq("work_instruction_id", step.work_instruction_id);

  query =
    direction === "up"
      ? query.lt("position", step.position).order("position", { ascending: false })
      : query.gt("position", step.position).order("position", { ascending: true });

  const { data: neighbor } = await query.limit(1).maybeSingle();

  if (neighbor) {
    await supabase.from("work_instruction_steps").update({ position: step.position }).eq("id", neighbor.id);
    await supabase.from("work_instruction_steps").update({ position: neighbor.position }).eq("id", step.id);
  }

  revalidatePath(`/dashboard/work-instructions/${step.work_instruction_id}`);
  redirect(`/dashboard/work-instructions/${step.work_instruction_id}#step-${stepId}`);
}

export async function moveStepUp(stepId: string) {
  await swapWithNeighbor(stepId, "up");
}

export async function moveStepDown(stepId: string) {
  await swapWithNeighbor(stepId, "down");
}

// Snapshots the current title + steps into a new, permanent version that
// people can view (and export to PDF) without it changing under them —
// even if the draft keeps being edited afterwards.
export async function publishWorkInstruction(wiId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: wi } = await supabase
    .from("work_instructions")
    .select("title, document_number, ppe_items, font, status")
    .eq("id", wiId)
    .single();

  if (!wi) {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        "Work instruction not found."
      )}`
    );
  }

  // Publishing IS the approve step here — same gating as Documents'
  // approveDocument: requires a check first if this category uses the
  // two-step workflow, and always requires approver-level authorization.
  const mode = await getWorkflowMode(supabase, profile.company_id, WI_CATEGORY);
  if (mode === "check_and_approve" && wi.status !== "checked") {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        "This category requires a check before it can be published."
      )}`
    );
  }

  const canApprove = await canActOnCategory(supabase, profile.company_id, WI_CATEGORY, profile.id, "approver");
  if (!canApprove) {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        "You're not authorized to publish work instructions in this category — see Authorization."
      )}`
    );
  }

  const { data: steps } = await supabase
    .from("work_instruction_steps")
    .select("id, title, body, caution, image_path")
    .eq("work_instruction_id", wiId)
    .order("position", { ascending: true });

  const { data: requiredEquipment } = await supabase
    .from("work_instruction_equipment")
    .select("equipment_items(id, name, image_path)")
    .eq("work_instruction_id", wiId);

  if (!steps || steps.length === 0) {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        "Add at least one step before publishing."
      )}`
    );
  }

  const { data: existingVersions } = await supabase
    .from("work_instruction_versions")
    .select("version_number")
    .eq("work_instruction_id", wiId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersionNumber = (existingVersions?.[0]?.version_number ?? 0) + 1;

  // Give this published version its OWN copy of every step photo, at a
  // path unique to this version number. That way, replacing a photo on
  // the live draft later can never affect a version that's already
  // published — each snapshot is fully independent.
  const content = await Promise.all(
    steps.map(async (step, index) => {
      let imagePath: string | null = null;

      if (step.image_path) {
        const extension = step.image_path.split(".").pop() || "jpg";
        const destPath = `${profile.company_id}/${wiId}/versions/${nextVersionNumber}/${step.id}.${extension}`;
        const { error: copyError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .copy(step.image_path, destPath);
        imagePath = copyError ? null : destPath;
      }

      return {
        position: index + 1,
        title: step.title,
        body: step.body,
        caution: step.caution,
        image_path: imagePath,
      };
    })
  );

  // Same idea for required equipment: each published version gets its own
  // copy of the photo, so later renaming/deleting a library item — or
  // even changing what a work instruction requires — can't alter a
  // version that's already published.
  const equipment = await Promise.all(
    (requiredEquipment ?? []).map(async (row) => {
      const item = row.equipment_items as unknown as {
        id: string;
        name: string;
        image_path: string | null;
      } | null;
      if (!item) return null;

      let imagePath: string | null = null;
      if (item.image_path) {
        const extension = item.image_path.split(".").pop() || "jpg";
        const destPath = `${profile.company_id}/${wiId}/versions/${nextVersionNumber}/equipment-${item.id}.${extension}`;
        const { error: copyError } = await supabase.storage
          .from(EQUIPMENT_BUCKET)
          .copy(item.image_path, destPath);
        imagePath = copyError ? null : destPath;
      }

      return { name: item.name, image_path: imagePath };
    })
  );

  const { data: version, error } = await supabase
    .from("work_instruction_versions")
    .insert({
      work_instruction_id: wiId,
      company_id: profile.company_id,
      version_number: nextVersionNumber,
      title: wi.title,
      document_number: wi.document_number,
      content,
      ppe_items: wi.ppe_items ?? [],
      equipment: equipment.filter((e): e is { name: string; image_path: string | null } => e !== null),
      font: wi.font ?? "sans",
      published_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !version) {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        error?.message ?? "Could not publish."
      )}`
    );
  }

  // Publishing implies this is now the approved, in-use version.
  await supabase
    .from("work_instructions")
    .update({
      current_published_version_id: version.id,
      status: "approved",
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", wiId);

  // Also push a PDF of this version into Documents — best-effort: a
  // problem generating/uploading the PDF shouldn't undo the publish that
  // already succeeded above, so this is deliberately swallowed rather than
  // redirected as an error.
  try {
    const built = await buildWorkInstructionVersionPdf(
      supabase,
      wiId,
      nextVersionNumber,
      profile.company_id,
      profile.companies?.logo_path ?? null
    );
    if (built) {
      await syncGeneratedDocument(supabase, {
        companyId: profile.company_id,
        sourceType: "work_instruction",
        sourceId: wiId,
        title: wi.title,
        documentNumber: wi.document_number,
        pdfBuffer: built.buffer,
        fileName: built.filename,
        actorId: profile.id,
      });
    }
  } catch (pdfSyncError) {
    console.error("Could not sync work instruction PDF into Documents:", pdfSyncError);
  }

  revalidatePath(`/dashboard/work-instructions/${wiId}`);
  revalidatePath("/dashboard/work-instructions");
  revalidatePath("/dashboard/documents");
  redirect(`/dashboard/work-instructions/${wiId}/view`);
}

export async function checkWorkInstruction(wiId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: wi } = await supabase.from("work_instructions").select("status").eq("id", wiId).single();
  if (!wi) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent("Work instruction not found.")}`);
  }

  const mode = await getWorkflowMode(supabase, profile.company_id, WI_CATEGORY);
  if (mode !== "check_and_approve") {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        "This category doesn't use a separate check step — publishing goes straight to Approve."
      )}`
    );
  }
  if (wi.status !== "draft") {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent("Only a draft can be marked as checked.")}`
    );
  }

  const allowed = await canActOnCategory(supabase, profile.company_id, WI_CATEGORY, profile.id, "checker");
  if (!allowed) {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        "You're not authorized to check work instructions in this category — see Authorization."
      )}`
    );
  }

  const { error } = await supabase
    .from("work_instructions")
    .update({ status: "checked", checked_by: profile.id, checked_at: new Date().toISOString() })
    .eq("id", wiId);

  if (error) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/work-instructions/${wiId}`);
  redirect(`/dashboard/work-instructions/${wiId}`);
}

// Unrestricted, same reasoning as Documents' returnToDraft — this is
// "someone caught an issue before final approval", not an authoring act,
// so anyone in the company can flag it rather than only an approver.
export async function returnWorkInstructionToDraft(wiId: string) {
  const { supabase } = await requireProfile();

  const { error } = await supabase
    .from("work_instructions")
    .update({ status: "draft", checked_by: null, checked_at: null, approved_by: null, approved_at: null })
    .eq("id", wiId);

  if (error) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/work-instructions/${wiId}`);
  redirect(`/dashboard/work-instructions/${wiId}`);
}

// The equivalent of Documents' "Create revision" — but work instructions
// don't need a file-copy step: the draft's steps are never deleted when
// published (publishing only takes a snapshot into work_instruction_
// versions), so reopening the draft for editing is enough on its own.
// The already-published version stays exactly as it was regardless.
export async function reviseWorkInstruction(wiId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: wi } = await supabase.from("work_instructions").select("status").eq("id", wiId).single();
  if (!wi) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent("Work instruction not found.")}`);
  }
  if (wi.status !== "approved") {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        "Only a published work instruction can be revised this way."
      )}`
    );
  }

  const allowed = await canActOnCategory(supabase, profile.company_id, WI_CATEGORY, profile.id, "author");
  if (!allowed) {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        "You're not authorized to revise work instructions in this category — see Authorization."
      )}`
    );
  }

  const { error } = await supabase
    .from("work_instructions")
    .update({ status: "draft", checked_by: null, checked_at: null, approved_by: null, approved_at: null })
    .eq("id", wiId);

  if (error) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/work-instructions/${wiId}`);
  revalidatePath("/dashboard/work-instructions");
  redirect(`/dashboard/work-instructions/${wiId}`);
}

export async function archiveWorkInstruction(wiId: string) {
  const { profile, supabase } = await requireProfile();

  const allowed = await canActOnCategory(supabase, profile.company_id, WI_CATEGORY, profile.id, "approver");
  if (!allowed) {
    redirect(
      `/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(
        "You're not authorized to archive work instructions in this category — see Authorization."
      )}`
    );
  }

  const { error } = await supabase.from("work_instructions").update({ status: "archived" }).eq("id", wiId);

  if (error) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/work-instructions/${wiId}`);
  revalidatePath("/dashboard/work-instructions");
  redirect(`/dashboard/work-instructions/${wiId}`);
}

// Emails the team that this work instruction was published — see
// src/lib/notify.ts.
export async function notifyWorkInstructionApproved(wiId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: wi } = await supabase.from("work_instructions").select("title").eq("id", wiId).single();
  if (!wi) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent("Work instruction not found.")}`);
  }

  const result = await notifyTeamOfApproval(supabase, {
    companyId: profile.company_id,
    actorId: profile.id,
    contentType: "work_instruction",
    title: wi.title,
    linkPath: `/dashboard/work-instructions/${wiId}/view`,
  });

  revalidatePath(`/dashboard/work-instructions/${wiId}`);
  revalidatePath("/dashboard/communications");
  if (result.error) {
    redirect(`/dashboard/work-instructions/${wiId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/dashboard/work-instructions/${wiId}?notified=${result.sent}`);
}

// "I have read and understood this" — clause 7.3. Same reasoning as
// attestDocument: insert-only, a repeat click is a harmless no-op against
// the unique constraint.
export async function attestWorkInstruction(wiId: string, workInstructionVersionId: string) {
  const { profile, supabase } = await requireProfile();

  await supabase.from("work_instruction_attestations").insert({
    company_id: profile.company_id,
    work_instruction_version_id: workInstructionVersionId,
    profile_id: profile.id,
  });

  revalidatePath(`/dashboard/work-instructions/${wiId}/view`);
}
