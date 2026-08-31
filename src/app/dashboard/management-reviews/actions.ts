"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { REVIEW_INPUT_FIELDS, REVIEW_OUTPUT_FIELDS } from "@/lib/management-reviews";

const VALID_STATUSES = ["planned", "completed"];
const NARRATIVE_KEYS = [...REVIEW_INPUT_FIELDS, ...REVIEW_OUTPUT_FIELDS].map((f) => f.key);

export async function createReview(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const reviewDate = String(formData.get("reviewDate") || "").trim();
  const attendees = String(formData.get("attendees") || "").trim();

  if (!title) {
    redirect(
      `/dashboard/management-reviews/new?error=${encodeURIComponent("Please give the review a title.")}`
    );
  }

  const { data, error } = await supabase
    .from("management_reviews")
    .insert({
      company_id: profile.company_id,
      title,
      review_date: reviewDate || new Date().toISOString().slice(0, 10),
      attendees: attendees || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/dashboard/management-reviews/new?error=${encodeURIComponent(
        error?.message ?? "Could not create the review."
      )}`
    );
  }

  revalidatePath("/dashboard/management-reviews");
  redirect(`/dashboard/management-reviews/${data.id}`);
}

export async function updateReview(reviewId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const status = String(formData.get("status") || "planned");
  const attendees = String(formData.get("attendees") || "").trim();
  const reviewDate = String(formData.get("reviewDate") || "").trim();

  if (!VALID_STATUSES.includes(status)) {
    redirect(`/dashboard/management-reviews/${reviewId}?error=${encodeURIComponent("Invalid status.")}`);
  }

  const narrativeUpdates: Record<string, string | null> = {};
  for (const key of NARRATIVE_KEYS) {
    const value = String(formData.get(key) || "").trim();
    narrativeUpdates[key] = value || null;
  }

  const { error } = await supabase
    .from("management_reviews")
    .update({
      status,
      attendees: attendees || null,
      review_date: reviewDate || new Date().toISOString().slice(0, 10),
      ...narrativeUpdates,
    })
    .eq("id", reviewId);

  if (error) {
    redirect(`/dashboard/management-reviews/${reviewId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/management-reviews/${reviewId}`);
  revalidatePath("/dashboard/management-reviews");
  redirect(`/dashboard/management-reviews/${reviewId}`);
}
