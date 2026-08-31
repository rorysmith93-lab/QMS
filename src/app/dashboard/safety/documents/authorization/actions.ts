"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import {
  SAFETY_AUTHORIZATION_LEVELS,
  SAFETY_DOCUMENT_CATEGORIES,
  SAFETY_WORKFLOW_MODES,
} from "@/lib/safety-documents";
import { canAccess } from "@/lib/roles";

const BASE_PATH = "/dashboard/safety/documents/authorization";
const VALID_CATEGORIES = SAFETY_DOCUMENT_CATEGORIES.map((c) => c.value);
const VALID_LEVELS = SAFETY_AUTHORIZATION_LEVELS.map((l) => l.value);
const VALID_MODES = SAFETY_WORKFLOW_MODES.map((m) => m.value);

export async function setSafetyWorkflowMode(category: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "safetyAuthorization")) {
    redirect(`${BASE_PATH}?error=${encodeURIComponent("Your role can't change this.")}`);
  }

  const mode = String(formData.get("mode") || "");

  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    redirect(`${BASE_PATH}?error=${encodeURIComponent("Invalid category.")}`);
  }
  if (!VALID_MODES.includes(mode as (typeof VALID_MODES)[number])) {
    redirect(`${BASE_PATH}?error=${encodeURIComponent("Invalid workflow mode.")}`);
  }

  const { error } = await supabase
    .from("safety_document_category_settings")
    .upsert({ company_id: profile.company_id, category, workflow_mode: mode }, { onConflict: "company_id,category" });

  if (error) {
    redirect(`${BASE_PATH}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(BASE_PATH);
  redirect(BASE_PATH);
}

export async function setSafetyAuthorization(category: string, targetProfileId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "safetyAuthorization")) {
    redirect(`${BASE_PATH}?error=${encodeURIComponent("Your role can't change this.")}`);
  }

  const level = String(formData.get("level") || "");

  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    redirect(`${BASE_PATH}?error=${encodeURIComponent("Invalid category.")}`);
  }

  if (!level) {
    const { error } = await supabase
      .from("safety_document_authorizations")
      .delete()
      .eq("company_id", profile.company_id)
      .eq("category", category)
      .eq("profile_id", targetProfileId);

    if (error) {
      redirect(`${BASE_PATH}?error=${encodeURIComponent(error.message)}`);
    }
  } else {
    if (!VALID_LEVELS.includes(level as (typeof VALID_LEVELS)[number])) {
      redirect(`${BASE_PATH}?error=${encodeURIComponent("Invalid authorization level.")}`);
    }

    const { error } = await supabase.from("safety_document_authorizations").upsert(
      { company_id: profile.company_id, category, profile_id: targetProfileId, level },
      { onConflict: "company_id,category,profile_id" }
    );

    if (error) {
      redirect(`${BASE_PATH}?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath(BASE_PATH);
  redirect(BASE_PATH);
}
