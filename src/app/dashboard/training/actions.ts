"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { TRAINING_TYPES } from "@/lib/training";
import { sanitizeFileName } from "@/lib/files";

const VALID_TYPES = TRAINING_TYPES.map((t) => t.value);

export async function logTraining(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const profileId = String(formData.get("profileId") || "");
  const trainingTitle = String(formData.get("trainingTitle") || "").trim();
  const trainingType = String(formData.get("trainingType") || "other");
  const provider = String(formData.get("provider") || "").trim();
  const completedDate = String(formData.get("completedDate") || "").trim();
  const expiryDate = String(formData.get("expiryDate") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const certificate = formData.get("certificate") as File | null;

  if (!profileId || !trainingTitle) {
    redirect(
      `/dashboard/training?error=${encodeURIComponent("Please select a team member and name the training.")}`
    );
  }
  if (!VALID_TYPES.includes(trainingType as (typeof VALID_TYPES)[number])) {
    redirect(`/dashboard/training?error=${encodeURIComponent("Invalid training type.")}`);
  }

  // Uploaded before the row exists (rather than after, keyed by its id) so
  // the insert can be a single all-or-nothing write — training_records has
  // no update policy, records are logged once and done.
  let certificatePath: string | null = null;
  let certificateName: string | null = null;
  if (certificate && certificate.size > 0) {
    certificatePath = `${profile.company_id}/${crypto.randomUUID()}-${sanitizeFileName(certificate.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(certificatePath, certificate, { contentType: certificate.type || undefined });

    if (uploadError) {
      redirect(
        `/dashboard/training?error=${encodeURIComponent(`Certificate failed to upload: ${uploadError.message}`)}`
      );
    }
    certificateName = certificate.name;
  }

  const { error } = await supabase.from("training_records").insert({
    company_id: profile.company_id,
    profile_id: profileId,
    training_title: trainingTitle,
    training_type: trainingType,
    provider: provider || null,
    completed_date: completedDate || new Date().toISOString().slice(0, 10),
    expiry_date: expiryDate || null,
    notes: notes || null,
    certificate_path: certificatePath,
    certificate_name: certificateName,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/training?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/training");
  redirect("/dashboard/training");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature must accept the form's FormData to be usable as a <form action>
export async function deleteTrainingRecord(recordId: string, _formData: FormData) {
  const { supabase } = await requireProfile();

  const { error } = await supabase.from("training_records").delete().eq("id", recordId);

  if (error) {
    redirect(`/dashboard/training?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/training");
  redirect("/dashboard/training");
}
