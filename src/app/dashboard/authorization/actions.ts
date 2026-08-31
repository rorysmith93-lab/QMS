"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { AUTHORIZATION_LEVELS, DOCUMENT_CATEGORIES, WORKFLOW_MODES } from "@/lib/documents";
import { canAccess } from "@/lib/roles";

const VALID_CATEGORIES = DOCUMENT_CATEGORIES.map((c) => c.value);
const VALID_LEVELS = AUTHORIZATION_LEVELS.map((l) => l.value);
const VALID_MODES = WORKFLOW_MODES.map((m) => m.value);

export async function setWorkflowMode(category: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "authorization")) {
    redirect(`/dashboard/authorization?error=${encodeURIComponent("Your role can't change this.")}`);
  }

  const mode = String(formData.get("mode") || "");

  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    redirect(`/dashboard/authorization?error=${encodeURIComponent("Invalid category.")}`);
  }
  if (!VALID_MODES.includes(mode as (typeof VALID_MODES)[number])) {
    redirect(`/dashboard/authorization?error=${encodeURIComponent("Invalid workflow mode.")}`);
  }

  const { error } = await supabase
    .from("document_category_settings")
    .upsert(
      { company_id: profile.company_id, category, workflow_mode: mode },
      { onConflict: "company_id,category" }
    );

  if (error) {
    redirect(`/dashboard/authorization?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/authorization");
  redirect("/dashboard/authorization");
}

export async function setAuthorization(category: string, targetProfileId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "authorization")) {
    redirect(`/dashboard/authorization?error=${encodeURIComponent("Your role can't change this.")}`);
  }

  const level = String(formData.get("level") || "");

  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    redirect(`/dashboard/authorization?error=${encodeURIComponent("Invalid category.")}`);
  }

  if (!level) {
    // Empty selection = "No access" — remove any existing row.
    const { error } = await supabase
      .from("document_authorizations")
      .delete()
      .eq("company_id", profile.company_id)
      .eq("category", category)
      .eq("profile_id", targetProfileId);

    if (error) {
      redirect(`/dashboard/authorization?error=${encodeURIComponent(error.message)}`);
    }
  } else {
    if (!VALID_LEVELS.includes(level as (typeof VALID_LEVELS)[number])) {
      redirect(`/dashboard/authorization?error=${encodeURIComponent("Invalid authorization level.")}`);
    }

    const { error } = await supabase.from("document_authorizations").upsert(
      { company_id: profile.company_id, category, profile_id: targetProfileId, level },
      { onConflict: "company_id,category,profile_id" }
    );

    if (error) {
      redirect(`/dashboard/authorization?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/dashboard/authorization");
  redirect("/dashboard/authorization");
}
