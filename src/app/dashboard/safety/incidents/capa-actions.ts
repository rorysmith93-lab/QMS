"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { sanitizeFileName } from "@/lib/files";
import { CAPA_STATUSES } from "@/lib/capa";

const VALID_STATUSES = CAPA_STATUSES.map((s) => s.value);

function incidentPath(incidentId: string) {
  return `/dashboard/safety/incidents/${incidentId}`;
}

export async function createCapaAction(incidentId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const description = String(formData.get("description") || "").trim();
  const assignedTo = String(formData.get("assignedTo") || "");
  const dueDate = String(formData.get("dueDate") || "");

  if (!description) {
    redirect(`${incidentPath(incidentId)}?error=${encodeURIComponent("Please describe the corrective action.")}`);
  }

  const { error } = await supabase.from("capa_actions").insert({
    company_id: profile.company_id,
    incident_id: incidentId,
    description,
    assigned_to: assignedTo || null,
    due_date: dueDate || null,
    created_by: profile.id,
  });

  if (error) {
    redirect(`${incidentPath(incidentId)}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(incidentPath(incidentId));
  redirect(incidentPath(incidentId));
}

// Handles status changes AND an optional proof-of-completion upload in one
// go — ticking "Completed" and attaching the proof is normally the same
// action for whoever closes the CAPA out.
export async function updateCapaAction(incidentId: string, capaId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const status = String(formData.get("status") || "open");
  const proofFile = formData.get("proofFile") as File | null;

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    redirect(`${incidentPath(incidentId)}?error=${encodeURIComponent("Invalid status.")}`);
  }

  const update: Record<string, unknown> = {
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };

  if (proofFile && proofFile.size > 0) {
    const filePath = `${profile.company_id}/${capaId}/${Date.now()}-${sanitizeFileName(proofFile.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("capa-proof")
      .upload(filePath, proofFile, { contentType: proofFile.type || undefined });

    if (uploadError) {
      redirect(`${incidentPath(incidentId)}?error=${encodeURIComponent(uploadError.message)}`);
    }

    update.proof_file_path = filePath;
    update.proof_file_name = proofFile.name;
  }

  const { error } = await supabase.from("capa_actions").update(update).eq("id", capaId);

  if (error) {
    redirect(`${incidentPath(incidentId)}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(incidentPath(incidentId));
  redirect(incidentPath(incidentId));
}
