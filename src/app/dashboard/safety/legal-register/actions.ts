"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { LEGAL_CATEGORIES, LEGAL_STATUSES } from "@/lib/legal-register";
import { linesToList } from "@/lib/root-cause-tools";

const BASE_PATH = "/dashboard/safety/legal-register";
const VALID_CATEGORIES = LEGAL_CATEGORIES.map((c) => c.value);
const VALID_STATUSES = LEGAL_STATUSES.map((s) => s.value);

export async function createLegalRegisterEntry(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const jurisdiction = String(formData.get("jurisdiction") || "").trim();
  const regulator = String(formData.get("regulator") || "").trim();
  const referenceNumber = String(formData.get("referenceNumber") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "other");
  const status = String(formData.get("status") || "in_progress");
  const owner = String(formData.get("owner") || "");
  const lastReviewedDate = String(formData.get("lastReviewedDate") || "");
  const nextReviewDate = String(formData.get("nextReviewDate") || "");

  if (!title) {
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent("Please provide a title.")}`);
  }
  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent("Invalid category.")}`);
  }
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent("Invalid status.")}`);
  }

  const { data, error } = await supabase
    .from("legal_register_entries")
    .insert({
      company_id: profile.company_id,
      title,
      jurisdiction: jurisdiction || null,
      regulator: regulator || null,
      reference_number: referenceNumber || null,
      description: description || null,
      category,
      status,
      owner: owner || null,
      last_reviewed_date: lastReviewedDate || null,
      next_review_date: nextReviewDate || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`${BASE_PATH}/new?error=${encodeURIComponent(error?.message ?? "Could not create the entry.")}`);
  }

  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${data.id}`);
}

export async function updateLegalRegisterEntry(entryId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const status = String(formData.get("status") || "in_progress");
  const owner = String(formData.get("owner") || "");
  const lastReviewedDate = String(formData.get("lastReviewedDate") || "");
  const nextReviewDate = String(formData.get("nextReviewDate") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    redirect(`${BASE_PATH}/${entryId}?error=${encodeURIComponent("Invalid status.")}`);
  }

  const { error } = await supabase
    .from("legal_register_entries")
    .update({
      status,
      owner: owner || null,
      last_reviewed_date: lastReviewedDate || null,
      next_review_date: nextReviewDate || null,
      notes: notes || null,
    })
    .eq("id", entryId);

  if (error) {
    redirect(`${BASE_PATH}/${entryId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${entryId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${entryId}`);
}

// Logs a compliance check (ISO 45001 clause 9.1.2). Checklist items come in
// as one per line (same textarea<->array convention as the fishbone tool's
// linesToList) and each inherits the overall pass/fail result — per-item
// results are a possible future refinement, not needed for a first pass.
export async function logComplianceCheck(entryId: string | null, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const performedDate = String(formData.get("performedDate") || "").trim();
  const overallResult = String(formData.get("overallResult") || "pass");
  const items = linesToList(String(formData.get("checklistItems") || ""));

  const redirectPath = entryId ? `${BASE_PATH}/${entryId}` : BASE_PATH;

  if (!title) {
    redirect(`${redirectPath}?error=${encodeURIComponent("Please provide a title for the check.")}`);
  }

  const checklist = items.map((item) => ({ item, result: overallResult, notes: "" }));

  const { error } = await supabase.from("legal_compliance_checks").insert({
    company_id: profile.company_id,
    legal_register_entry_id: entryId,
    title,
    checklist,
    overall_result: overallResult === "fail" ? "fail" : "pass",
    performed_by: profile.id,
    performed_date: performedDate || new Date().toISOString().slice(0, 10),
  });

  if (error) {
    redirect(`${redirectPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(redirectPath);
  redirect(redirectPath);
}
