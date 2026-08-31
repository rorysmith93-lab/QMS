"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { sanitizeFileName } from "@/lib/files";
import { INFRASTRUCTURE_CATEGORIES } from "@/lib/infrastructure";

const VALID_CATEGORIES = INFRASTRUCTURE_CATEGORIES.map((c) => c.value);
const CERTIFICATE_BUCKET = "certificates";

export async function createInfrastructureAsset(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "production_equipment");
  const location = String(formData.get("location") || "").trim();
  const requiresMaintenance = formData.get("requiresMaintenance") === "on";
  const notes = String(formData.get("notes") || "").trim();

  if (!name) {
    redirect(`/dashboard/equipment/infrastructure/new?error=${encodeURIComponent("Please give it a name.")}`);
  }

  const { error } = await supabase.from("infrastructure_assets").insert({
    company_id: profile.company_id,
    name,
    category: VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])
      ? category
      : "production_equipment",
    location: location || null,
    requires_maintenance: requiresMaintenance,
    notes: notes || null,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/equipment/infrastructure/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/equipment/infrastructure");
  redirect("/dashboard/equipment/infrastructure");
}

export async function updateInfrastructureAsset(assetId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "production_equipment");
  const location = String(formData.get("location") || "").trim();
  const requiresMaintenance = formData.get("requiresMaintenance") === "on";
  const notes = String(formData.get("notes") || "").trim();

  if (!name) {
    redirect(`/dashboard/equipment/infrastructure/${assetId}?error=${encodeURIComponent("Name can't be empty.")}`);
  }

  const { error } = await supabase
    .from("infrastructure_assets")
    .update({
      name,
      category: VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])
        ? category
        : "production_equipment",
      location: location || null,
      requires_maintenance: requiresMaintenance,
      notes: notes || null,
    })
    .eq("id", assetId);

  if (error) {
    redirect(`/dashboard/equipment/infrastructure/${assetId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/equipment/infrastructure");
  revalidatePath(`/dashboard/equipment/infrastructure/${assetId}`);
  redirect(`/dashboard/equipment/infrastructure/${assetId}?saved=1`);
}

export async function logMaintenance(assetId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const performedDate = String(formData.get("performedDate") || "").trim();
  const nextDueDate = String(formData.get("nextDueDate") || "").trim();
  const performedBy = String(formData.get("performedBy") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const certificate = formData.get("certificate") as File | null;

  // Uploaded before the row exists so the insert below is a single
  // all-or-nothing write — same reasoning as equipment calibration.
  let certificatePath: string | null = null;
  let certificateName: string | null = null;
  if (certificate && certificate.size > 0) {
    certificatePath = `${profile.company_id}/${crypto.randomUUID()}-${sanitizeFileName(certificate.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(CERTIFICATE_BUCKET)
      .upload(certificatePath, certificate, { contentType: certificate.type || undefined });

    if (uploadError) {
      redirect(
        `/dashboard/equipment/infrastructure/${assetId}?error=${encodeURIComponent(
          `File failed to upload: ${uploadError.message}`
        )}`
      );
    }
    certificateName = certificate.name;
  }

  const { error } = await supabase.from("infrastructure_maintenance_records").insert({
    company_id: profile.company_id,
    infrastructure_asset_id: assetId,
    performed_date: performedDate || new Date().toISOString().slice(0, 10),
    next_due_date: nextDueDate || null,
    performed_by: performedBy || null,
    notes: notes || null,
    certificate_path: certificatePath,
    certificate_name: certificateName,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/equipment/infrastructure/${assetId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/equipment/infrastructure/${assetId}`);
  revalidatePath("/dashboard/equipment/infrastructure");
  redirect(`/dashboard/equipment/infrastructure/${assetId}?saved=1`);
}

export async function deleteInfrastructureAsset(assetId: string) {
  const { supabase } = await requireProfile();

  await supabase.from("infrastructure_assets").delete().eq("id", assetId);

  revalidatePath("/dashboard/equipment/infrastructure");
  redirect("/dashboard/equipment/infrastructure");
}
