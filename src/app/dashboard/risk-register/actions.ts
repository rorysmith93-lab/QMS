"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { canAccess } from "@/lib/roles";
import { RISK_STATUSES, RISK_TYPES, RISK_LEVELS } from "@/lib/quality-risks";

const VALID_TYPES = RISK_TYPES.map((t) => t.value);
const VALID_LEVELS = RISK_LEVELS.map((l) => l.value);
const VALID_STATUSES = RISK_STATUSES.map((s) => s.value);

export async function createRisk(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "riskRegister")) {
    redirect(`/dashboard/risk-register?error=${encodeURIComponent("Your role can't add to the risk register.")}`);
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const type = String(formData.get("type") || "risk");
  const likelihood = String(formData.get("likelihood") || "");
  const impact = String(formData.get("impact") || "");
  const mitigatingAction = String(formData.get("mitigatingAction") || "").trim();
  const owner = String(formData.get("owner") || "");
  const reviewDate = String(formData.get("reviewDate") || "");

  if (!title) {
    redirect(`/dashboard/risk-register?error=${encodeURIComponent("Please give it a title.")}`);
  }
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    redirect(`/dashboard/risk-register?error=${encodeURIComponent("Invalid type.")}`);
  }

  const { error } = await supabase.from("quality_risks").insert({
    company_id: profile.company_id,
    title,
    description: description || null,
    type,
    likelihood: VALID_LEVELS.includes(likelihood as (typeof VALID_LEVELS)[number]) ? likelihood : null,
    impact: VALID_LEVELS.includes(impact as (typeof VALID_LEVELS)[number]) ? impact : null,
    mitigating_action: mitigatingAction || null,
    owner: owner || null,
    review_date: reviewDate || null,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/risk-register?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/risk-register");
  redirect("/dashboard/risk-register");
}

export async function updateRisk(riskId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "riskRegister")) {
    redirect(`/dashboard/risk-register?error=${encodeURIComponent("Your role can't edit the risk register.")}`);
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const type = String(formData.get("type") || "risk");
  const likelihood = String(formData.get("likelihood") || "");
  const impact = String(formData.get("impact") || "");
  const mitigatingAction = String(formData.get("mitigatingAction") || "").trim();
  const owner = String(formData.get("owner") || "");
  const reviewDate = String(formData.get("reviewDate") || "");
  const status = String(formData.get("status") || "open");

  if (!title) {
    redirect(`/dashboard/risk-register?error=${encodeURIComponent("Please give it a title.")}`);
  }
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    redirect(`/dashboard/risk-register?error=${encodeURIComponent("Invalid status.")}`);
  }

  const { error } = await supabase
    .from("quality_risks")
    .update({
      title,
      description: description || null,
      type: VALID_TYPES.includes(type as (typeof VALID_TYPES)[number]) ? type : "risk",
      likelihood: VALID_LEVELS.includes(likelihood as (typeof VALID_LEVELS)[number]) ? likelihood : null,
      impact: VALID_LEVELS.includes(impact as (typeof VALID_LEVELS)[number]) ? impact : null,
      mitigating_action: mitigatingAction || null,
      owner: owner || null,
      review_date: reviewDate || null,
      status,
    })
    .eq("id", riskId);

  if (error) {
    redirect(`/dashboard/risk-register?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/risk-register");
  redirect("/dashboard/risk-register");
}
