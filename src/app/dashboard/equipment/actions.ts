"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { sanitizeFileName } from "@/lib/files";

const IMAGE_BUCKET = "equipment-images";

export async function createEquipment(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const name = String(formData.get("name") || "").trim();
  const image = formData.get("image") as File | null;
  const requiresCalibration = formData.get("requiresCalibration") === "on";

  if (!name) {
    redirect(`/dashboard/equipment/new?error=${encodeURIComponent("Please give it a name.")}`);
  }

  const { data: item, error } = await supabase
    .from("equipment_items")
    .insert({
      company_id: profile.company_id,
      name,
      requires_calibration: requiresCalibration,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !item) {
    redirect(
      `/dashboard/equipment/new?error=${encodeURIComponent(
        error?.message ?? "Could not create the equipment item."
      )}`
    );
  }

  if (image && image.size > 0) {
    const path = `${profile.company_id}/${item.id}-${Date.now()}-${sanitizeFileName(image.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, image, { contentType: image.type || undefined });
    if (!uploadError) {
      await supabase.from("equipment_items").update({ image_path: path }).eq("id", item.id);
    }
  }

  revalidatePath("/dashboard/equipment");
  redirect("/dashboard/equipment");
}

export async function updateEquipment(equipmentId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const name = String(formData.get("name") || "").trim();
  const image = formData.get("image") as File | null;
  const removeImage = formData.get("removeImage") === "on";
  const requiresCalibration = formData.get("requiresCalibration") === "on";

  if (!name) {
    redirect(
      `/dashboard/equipment/${equipmentId}?error=${encodeURIComponent("Name can't be empty.")}`
    );
  }

  const { data: current } = await supabase
    .from("equipment_items")
    .select("image_path")
    .eq("id", equipmentId)
    .single();

  let imagePath = current?.image_path ?? null;

  if (image && image.size > 0) {
    const path = `${profile.company_id}/${equipmentId}-${Date.now()}-${sanitizeFileName(image.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, image, { contentType: image.type || undefined });
    if (uploadError) {
      redirect(
        `/dashboard/equipment/${equipmentId}?error=${encodeURIComponent(uploadError.message)}`
      );
    }
    if (current?.image_path) {
      await supabase.storage.from(IMAGE_BUCKET).remove([current.image_path]);
    }
    imagePath = path;
  } else if (removeImage && current?.image_path) {
    await supabase.storage.from(IMAGE_BUCKET).remove([current.image_path]);
    imagePath = null;
  }

  const { error } = await supabase
    .from("equipment_items")
    .update({ name, image_path: imagePath, requires_calibration: requiresCalibration })
    .eq("id", equipmentId);

  if (error) {
    redirect(`/dashboard/equipment/${equipmentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/equipment");
  revalidatePath(`/dashboard/equipment/${equipmentId}`);
  redirect(`/dashboard/equipment/${equipmentId}?saved=1`);
}

const VALID_RESULTS = ["pass", "fail", "adjusted"];
const CERTIFICATE_BUCKET = "certificates";

export async function logCalibration(equipmentId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const calibratedDate = String(formData.get("calibratedDate") || "").trim();
  const nextDueDate = String(formData.get("nextDueDate") || "").trim();
  const performedBy = String(formData.get("performedBy") || "").trim();
  const result = String(formData.get("result") || "pass");
  const notes = String(formData.get("notes") || "").trim();
  const certificate = formData.get("certificate") as File | null;

  if (!VALID_RESULTS.includes(result)) {
    redirect(`/dashboard/equipment/${equipmentId}?error=${encodeURIComponent("Invalid result.")}`);
  }

  // Same reasoning as training certificates — uploaded before the row
  // exists so the insert is a single all-or-nothing write.
  let certificatePath: string | null = null;
  let certificateName: string | null = null;
  if (certificate && certificate.size > 0) {
    certificatePath = `${profile.company_id}/${crypto.randomUUID()}-${sanitizeFileName(certificate.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(CERTIFICATE_BUCKET)
      .upload(certificatePath, certificate, { contentType: certificate.type || undefined });

    if (uploadError) {
      redirect(
        `/dashboard/equipment/${equipmentId}?error=${encodeURIComponent(
          `Certificate failed to upload: ${uploadError.message}`
        )}`
      );
    }
    certificateName = certificate.name;
  }

  const { error } = await supabase.from("equipment_calibrations").insert({
    company_id: profile.company_id,
    equipment_item_id: equipmentId,
    calibrated_date: calibratedDate || new Date().toISOString().slice(0, 10),
    next_due_date: nextDueDate || null,
    performed_by: performedBy || null,
    result,
    notes: notes || null,
    certificate_path: certificatePath,
    certificate_name: certificateName,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/equipment/${equipmentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/equipment/${equipmentId}`);
  revalidatePath("/dashboard/equipment");
  redirect(`/dashboard/equipment/${equipmentId}?saved=1`);
}

export async function deleteEquipment(equipmentId: string) {
  const { supabase } = await requireProfile();

  const { data: item } = await supabase
    .from("equipment_items")
    .select("image_path")
    .eq("id", equipmentId)
    .single();

  await supabase.from("equipment_items").delete().eq("id", equipmentId);

  if (item?.image_path) {
    await supabase.storage.from(IMAGE_BUCKET).remove([item.image_path]);
  }

  revalidatePath("/dashboard/equipment");
  redirect("/dashboard/equipment");
}
