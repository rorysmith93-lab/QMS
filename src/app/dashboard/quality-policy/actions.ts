"use server";

import { createElement } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireProfile } from "@/lib/current-profile";
import { QualityPolicyDocument } from "@/lib/pdf/quality-policy-document";
import { downloadPdfLogoBuffer } from "@/lib/pdf/pdf-logo";
import { syncGeneratedDocument } from "@/lib/generated-documents";

const VALID_STATUSES = ["not_started", "on_track", "at_risk", "achieved", "missed"];

export async function publishPolicy(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const statement = String(formData.get("statement") || "").trim();
  const effectiveDate = String(formData.get("effectiveDate") || "").trim();
  const approvedBy = String(formData.get("approvedBy") || "").trim();

  if (!statement) {
    redirect(`/dashboard/quality-policy?error=${encodeURIComponent("Please write the policy statement.")}`);
  }

  const resolvedEffectiveDate = effectiveDate || new Date().toISOString().slice(0, 10);
  const resolvedApprovedBy = approvedBy || profile.full_name || null;

  const { data: policy, error } = await supabase
    .from("quality_policies")
    .insert({
      company_id: profile.company_id,
      statement,
      effective_date: resolvedEffectiveDate,
      approved_by: resolvedApprovedBy,
      created_by: profile.id,
    })
    .select("version")
    .single();

  if (error) {
    redirect(`/dashboard/quality-policy?error=${encodeURIComponent(error.message)}`);
  }

  // Also push a PDF of this version into Documents — best-effort: a
  // problem generating/uploading the PDF shouldn't undo the publish that
  // already succeeded above, so this is deliberately swallowed rather
  // than redirected as an error. There's no single persistent "the
  // policy" row across versions (each version is its own insert), so the
  // generated Documents entry is linked to the company itself — there's
  // only ever one "the quality policy" per company.
  if (policy) {
    try {
      const logoBuffer = await downloadPdfLogoBuffer(supabase, profile.company_id, profile.companies?.logo_path ?? null);

      const pdfBuffer = await renderToBuffer(
        createElement(QualityPolicyDocument, {
          title: "Quality Policy",
          version: policy.version,
          effectiveDateLabel: new Date(resolvedEffectiveDate).toLocaleDateString(),
          approvedBy: resolvedApprovedBy,
          logoBuffer,
          statement,
        })
      );

      await syncGeneratedDocument(supabase, {
        companyId: profile.company_id,
        sourceType: "quality_policy",
        sourceId: profile.company_id,
        title: "Quality Policy",
        documentNumber: null,
        pdfBuffer,
        fileName: `quality-policy-v${policy.version}.pdf`,
        actorId: profile.id,
      });
    } catch (pdfSyncError) {
      console.error("Could not sync Quality Policy PDF into Documents:", pdfSyncError);
    }
  }

  revalidatePath("/dashboard/quality-policy");
  revalidatePath("/dashboard/documents");
  redirect("/dashboard/quality-policy");
}

export async function createObjective(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const target = String(formData.get("target") || "").trim();
  const owner = String(formData.get("owner") || "");
  const targetDate = String(formData.get("targetDate") || "");

  if (!title) {
    redirect(`/dashboard/quality-policy?error=${encodeURIComponent("Please give the objective a title.")}`);
  }

  const { error } = await supabase.from("quality_objectives").insert({
    company_id: profile.company_id,
    title,
    target: target || null,
    owner: owner || null,
    target_date: targetDate || null,
    created_by: profile.id,
  });

  if (error) {
    redirect(`/dashboard/quality-policy?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/quality-policy");
  redirect("/dashboard/quality-policy");
}

export async function updateObjective(objectiveId: string, formData: FormData) {
  const { supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const target = String(formData.get("target") || "").trim();
  const owner = String(formData.get("owner") || "");
  const targetDate = String(formData.get("targetDate") || "");
  const status = String(formData.get("status") || "not_started");
  const progressNotes = String(formData.get("progressNotes") || "").trim();

  if (!title) {
    redirect(`/dashboard/quality-policy?error=${encodeURIComponent("Please give the objective a title.")}`);
  }
  if (!VALID_STATUSES.includes(status)) {
    redirect(`/dashboard/quality-policy?error=${encodeURIComponent("Invalid status.")}`);
  }

  const { error } = await supabase
    .from("quality_objectives")
    .update({
      title,
      target: target || null,
      owner: owner || null,
      target_date: targetDate || null,
      status,
      progress_notes: progressNotes || null,
    })
    .eq("id", objectiveId);

  if (error) {
    redirect(`/dashboard/quality-policy?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/quality-policy");
  redirect("/dashboard/quality-policy");
}
