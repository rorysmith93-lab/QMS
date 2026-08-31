"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { canAccess } from "@/lib/roles";
import { PARTY_CATEGORIES } from "@/lib/context-and-scope";

const VALID_CATEGORIES = PARTY_CATEGORIES.map((c) => c.value);

export async function publishContextScope(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "contextAndScope")) {
    redirect(`/dashboard/context?error=${encodeURIComponent("Your role can't publish this.")}`);
  }

  const externalIssues = String(formData.get("externalIssues") || "").trim();
  const internalIssues = String(formData.get("internalIssues") || "").trim();
  const scopeStatement = String(formData.get("scopeStatement") || "").trim();
  const exclusions = String(formData.get("exclusions") || "").trim();
  const effectiveDate = String(formData.get("effectiveDate") || "").trim();
  const approvedBy = String(formData.get("approvedBy") || "").trim();

  if (!scopeStatement) {
    redirect(`/dashboard/context?error=${encodeURIComponent("Please write the scope statement.")}`);
  }

  const { data: existingVersions } = await supabase
    .from("qms_context_scope")
    .select("version")
    .eq("company_id", profile.company_id)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = (existingVersions?.[0]?.version ?? 0) + 1;

  const { error } = await supabase.from("qms_context_scope").insert({
    company_id: profile.company_id,
    version: nextVersion,
    external_issues: externalIssues || null,
    internal_issues: internalIssues || null,
    scope_statement: scopeStatement,
    exclusions: exclusions || null,
    effective_date: effectiveDate || new Date().toISOString().slice(0, 10),
    approved_by: approvedBy || profile.full_name || null,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/context?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/context");
  redirect("/dashboard/context");
}

export async function createInterestedParty(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "contextAndScope")) {
    redirect(`/dashboard/context?error=${encodeURIComponent("Your role can't edit interested parties.")}`);
  }

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "other");
  const needsExpectations = String(formData.get("needsExpectations") || "").trim();

  if (!name) {
    redirect(`/dashboard/context?error=${encodeURIComponent("Please give the interested party a name.")}`);
  }

  const { error } = await supabase.from("interested_parties").insert({
    company_id: profile.company_id,
    name,
    category: VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number]) ? category : "other",
    needs_expectations: needsExpectations || null,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/context?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/context");
  redirect("/dashboard/context");
}

export async function updateInterestedParty(partyId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "contextAndScope")) {
    redirect(`/dashboard/context?error=${encodeURIComponent("Your role can't edit interested parties.")}`);
  }

  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "other");
  const needsExpectations = String(formData.get("needsExpectations") || "").trim();

  if (!name) {
    redirect(`/dashboard/context?error=${encodeURIComponent("Please give the interested party a name.")}`);
  }

  const { error } = await supabase
    .from("interested_parties")
    .update({
      name,
      category: VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number]) ? category : "other",
      needs_expectations: needsExpectations || null,
    })
    .eq("id", partyId);

  if (error) {
    redirect(`/dashboard/context?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/context");
  redirect("/dashboard/context");
}

export async function deleteInterestedParty(partyId: string) {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "contextAndScope")) {
    redirect(`/dashboard/context?error=${encodeURIComponent("Your role can't edit interested parties.")}`);
  }

  const { error } = await supabase.from("interested_parties").delete().eq("id", partyId);

  if (error) {
    redirect(`/dashboard/context?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/context");
  redirect("/dashboard/context");
}
