"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { sanitizeFileName } from "@/lib/files";
import { INCIDENT_STATUSES, INCIDENT_SEVERITIES, INCIDENT_TYPES } from "@/lib/safety-incidents";

const BASE_PATH = "/dashboard/safety/incidents";
const VALID_TYPES = INCIDENT_TYPES.map((t) => t.value);
const VALID_SEVERITIES = INCIDENT_SEVERITIES.map((s) => s.value);
const VALID_STATUSES = INCIDENT_STATUSES.map((s) => s.value);

export async function createSafetyIncident(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const type = String(formData.get("type") || "near_miss");
  const severity = String(formData.get("severity") || "low");
  const dateOccurred = String(formData.get("dateOccurred") || "").trim();
  const dateReported = String(formData.get("dateReported") || "").trim();
  const locationText = String(formData.get("locationText") || "").trim();
  const latitude = String(formData.get("latitude") || "").trim();
  const longitude = String(formData.get("longitude") || "").trim();
  const injuredPersonName = String(formData.get("injuredPersonName") || "").trim();
  const department = String(formData.get("department") || "").trim();
  const assignedTo = String(formData.get("assignedTo") || "");
  const dueDate = String(formData.get("dueDate") || "");
  const photos = formData.getAll("photos") as File[];

  if (!title || !description) {
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent("Please fill in a title and description.")}`);
  }
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent("Invalid type.")}`);
  }
  if (!VALID_SEVERITIES.includes(severity as (typeof VALID_SEVERITIES)[number])) {
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent("Invalid severity.")}`);
  }

  const { data: incident, error } = await supabase
    .from("safety_incidents")
    .insert({
      company_id: profile.company_id,
      type,
      severity,
      title,
      description,
      location_text: locationText || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      date_occurred: dateOccurred || new Date().toISOString().slice(0, 10),
      date_reported: dateReported || new Date().toISOString().slice(0, 10),
      reported_by: profile.id,
      injured_person_name: injuredPersonName || null,
      department: department || null,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !incident) {
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent(error?.message ?? "Could not log the incident.")}`);
  }

  // Photos are best-effort — a failed upload shouldn't lose the incident
  // report itself, which is the important part.
  for (const photo of photos) {
    if (!photo || photo.size === 0) continue;
    const filePath = `${profile.company_id}/${incident.id}/${Date.now()}-${sanitizeFileName(photo.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("safety-incident-photos")
      .upload(filePath, photo, { contentType: photo.type || undefined });
    if (!uploadError) {
      await supabase.from("safety_incident_photos").insert({
        incident_id: incident.id,
        company_id: profile.company_id,
        file_path: filePath,
        file_name: photo.name,
        uploaded_by: profile.id,
      });
    }
  }

  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${incident.id}`);
}

export async function updateSafetyIncident(incidentId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const status = String(formData.get("status") || "open");
  const assignedTo = String(formData.get("assignedTo") || "");
  const dueDate = String(formData.get("dueDate") || "");
  const rootCause = String(formData.get("rootCause") || "").trim();

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    redirect(`${BASE_PATH}/${incidentId}?error=${encodeURIComponent("Invalid status.")}`);
  }

  const { data: existing } = await supabase
    .from("safety_incidents")
    .select("status, closed_at")
    .eq("id", incidentId)
    .single();

  let closedAt = existing?.closed_at ?? null;
  if (status === "closed" && existing?.status !== "closed") {
    closedAt = new Date().toISOString();
  } else if (status !== "closed") {
    closedAt = null;
  }

  const { error } = await supabase
    .from("safety_incidents")
    .update({
      status,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      root_cause: rootCause || null,
      closed_at: closedAt,
    })
    .eq("id", incidentId);

  if (error) {
    redirect(`${BASE_PATH}/${incidentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${incidentId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${incidentId}`);
}

export async function addSafetyIncidentPhotos(incidentId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const photos = formData.getAll("photos") as File[];
  let anyUploaded = false;

  for (const photo of photos) {
    if (!photo || photo.size === 0) continue;
    const filePath = `${profile.company_id}/${incidentId}/${Date.now()}-${sanitizeFileName(photo.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("safety-incident-photos")
      .upload(filePath, photo, { contentType: photo.type || undefined });
    if (!uploadError) {
      await supabase.from("safety_incident_photos").insert({
        incident_id: incidentId,
        company_id: profile.company_id,
        file_path: filePath,
        file_name: photo.name,
        uploaded_by: profile.id,
      });
      anyUploaded = true;
    }
  }

  if (!anyUploaded) {
    redirect(`${BASE_PATH}/${incidentId}?error=${encodeURIComponent("No photos were uploaded.")}`);
  }

  revalidatePath(`${BASE_PATH}/${incidentId}`);
  redirect(`${BASE_PATH}/${incidentId}`);
}
