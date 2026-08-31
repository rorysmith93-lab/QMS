"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { canAccess } from "@/lib/roles";
import { COMMUNICATION_DIRECTIONS } from "@/lib/communications";

const VALID_DIRECTIONS = COMMUNICATION_DIRECTIONS.map((d) => d.value);

export async function createCommunication(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "communications")) {
    redirect(`/dashboard/communications?error=${encodeURIComponent("Your role can't log communications.")}`);
  }

  const occurredOn = String(formData.get("occurredOn") || "").trim();
  const direction = String(formData.get("direction") || "internal");
  const audience = String(formData.get("audience") || "").trim();
  const method = String(formData.get("method") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  const relatedTo = String(formData.get("relatedTo") || "").trim();
  const communicatedBy = String(formData.get("communicatedBy") || "");

  if (!audience || !method || !summary) {
    redirect(
      `/dashboard/communications?error=${encodeURIComponent("Please fill in who it was with, how, and what was said.")}`
    );
  }

  const { error } = await supabase.from("communications").insert({
    company_id: profile.company_id,
    occurred_on: occurredOn || new Date().toISOString().slice(0, 10),
    direction: VALID_DIRECTIONS.includes(direction as (typeof VALID_DIRECTIONS)[number]) ? direction : "internal",
    audience,
    method,
    summary,
    related_to: relatedTo || null,
    communicated_by: communicatedBy || profile.id,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/communications?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/communications");
  redirect("/dashboard/communications");
}

export async function deleteCommunication(communicationId: string) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "communications")) {
    redirect(`/dashboard/communications?error=${encodeURIComponent("Your role can't delete log entries.")}`);
  }

  await supabase.from("communications").delete().eq("id", communicationId);

  revalidatePath("/dashboard/communications");
  redirect("/dashboard/communications");
}
