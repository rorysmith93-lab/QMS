"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { isValidHexColor } from "@/lib/color";
import { isValidFontId } from "@/lib/fonts";

export async function updateBranding(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const companyName = String(formData.get("companyName") || "").trim();
  const primaryColor = String(formData.get("primaryColor") || "").trim();
  const fontFamily = String(formData.get("fontFamily") || "").trim();

  if (!companyName) {
    redirect(
      `/dashboard/settings?error=${encodeURIComponent("Company name can't be empty.")}`
    );
  }

  if (!isValidHexColor(primaryColor)) {
    redirect(
      `/dashboard/settings?error=${encodeURIComponent(
        "Brand colour must be a hex code like #2563EB."
      )}`
    );
  }

  if (!isValidFontId(fontFamily)) {
    redirect(`/dashboard/settings?error=${encodeURIComponent("Pick a font from the list.")}`);
  }

  const { error } = await supabase
    .from("companies")
    .update({ name: companyName, primary_color: primaryColor, font_family: fontFamily })
    .eq("id", profile.company_id);

  if (error) {
    redirect(`/dashboard/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings?saved=1");
}

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

export async function uploadLogo(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const file = formData.get("logo") as File | null;

  if (!file || file.size === 0) {
    redirect(`/dashboard/settings?error=${encodeURIComponent("Please choose a logo file.")}`);
  }

  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    redirect(
      `/dashboard/settings?error=${encodeURIComponent(
        "Logo must be a PNG, JPEG, WebP, or SVG image."
      )}`
    );
  }

  // Find the current logo (if any) so we can remove it after the new one's
  // in place, instead of leaving orphaned files in storage. Also grab any
  // cached PDF-safe (rasterized) copy of the OLD logo, so it can be
  // cleaned up too — it belongs to the logo being replaced, not the new one.
  const { data: company } = await supabase
    .from("companies")
    .select("logo_path, logo_pdf_path")
    .eq("id", profile.company_id)
    .single();

  const extension = file.name.split(".").pop() || "png";
  // A timestamped filename so the browser never shows a stale cached logo
  // after someone replaces it.
  const path = `${profile.company_id}/logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    redirect(`/dashboard/settings?error=${encodeURIComponent(uploadError.message)}`);
  }

  // Clear logo_pdf_path too — it was a rasterized copy of the OLD logo
  // (see src/lib/pdf/pdf-logo.ts), which no longer applies now that the
  // logo itself has changed. It'll get regenerated automatically the next
  // time a PDF needs it, if the new logo also turns out to be an SVG.
  const { error: updateError } = await supabase
    .from("companies")
    .update({ logo_path: path, logo_pdf_path: null })
    .eq("id", profile.company_id);

  if (updateError) {
    redirect(`/dashboard/settings?error=${encodeURIComponent(updateError.message)}`);
  }

  if (company?.logo_path) {
    await supabase.storage.from("logos").remove([company.logo_path]);
  }
  if (company?.logo_pdf_path) {
    await supabase.storage.from("logos").remove([company.logo_pdf_path]);
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings?saved=1");
}

// Generates (or rotates) this company's MES NCR sync key — see
// supabase/ncr_sync_schema.sql and src/app/api/ncr-sync/route.ts. The RPC
// itself scopes the update to the caller's own company
// (current_company_id()), so there's nothing else to authorize here.
export async function regenerateNcrSyncKey() {
  const { supabase } = await requireProfile();

  const { error } = await supabase.rpc("regenerate_ncr_sync_key");

  if (error) {
    redirect(`/dashboard/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=1");
}
