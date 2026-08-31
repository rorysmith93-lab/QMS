"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { canAccess } from "@/lib/roles";
import { APPROVAL_STATUSES } from "@/lib/suppliers";

const VALID_STATUSES = APPROVAL_STATUSES.map((s) => s.value);

export async function createSupplier(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "supplierRegister")) {
    redirect(`/dashboard/suppliers?error=${encodeURIComponent("Your role can't add to the supplier register.")}`);
  }

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const contactPhone = String(formData.get("contactPhone") || "").trim();
  const approvalStatus = String(formData.get("approvalStatus") || "under_review");
  const lastEvaluatedDate = String(formData.get("lastEvaluatedDate") || "");
  const nextEvaluationDate = String(formData.get("nextEvaluationDate") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!name) {
    redirect(`/dashboard/suppliers?error=${encodeURIComponent("Please give the supplier a name.")}`);
  }

  const { error } = await supabase.from("suppliers").insert({
    company_id: profile.company_id,
    name,
    category: category || null,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    approval_status: VALID_STATUSES.includes(approvalStatus as (typeof VALID_STATUSES)[number])
      ? approvalStatus
      : "under_review",
    last_evaluated_date: lastEvaluatedDate || null,
    next_evaluation_date: nextEvaluationDate || null,
    notes: notes || null,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/suppliers?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/suppliers");
  redirect("/dashboard/suppliers");
}

export async function updateSupplier(supplierId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "supplierRegister")) {
    redirect(`/dashboard/suppliers?error=${encodeURIComponent("Your role can't edit the supplier register.")}`);
  }

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const contactPhone = String(formData.get("contactPhone") || "").trim();
  const approvalStatus = String(formData.get("approvalStatus") || "under_review");
  const lastEvaluatedDate = String(formData.get("lastEvaluatedDate") || "");
  const nextEvaluationDate = String(formData.get("nextEvaluationDate") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!name) {
    redirect(`/dashboard/suppliers?error=${encodeURIComponent("Please give the supplier a name.")}`);
  }
  if (!VALID_STATUSES.includes(approvalStatus as (typeof VALID_STATUSES)[number])) {
    redirect(`/dashboard/suppliers?error=${encodeURIComponent("Invalid approval status.")}`);
  }

  const { error } = await supabase
    .from("suppliers")
    .update({
      name,
      category: category || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      approval_status: approvalStatus,
      last_evaluated_date: lastEvaluatedDate || null,
      next_evaluation_date: nextEvaluationDate || null,
      notes: notes || null,
    })
    .eq("id", supplierId);

  if (error) {
    redirect(`/dashboard/suppliers?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/suppliers");
  redirect("/dashboard/suppliers");
}
