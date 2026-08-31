"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { sanitizeFileName } from "@/lib/files";
import { canActOnCategory, getWorkflowMode } from "@/lib/document-authorization";

export async function createDocument(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const documentNumber = String(formData.get("documentNumber") || "").trim();
  const category = String(formData.get("category") || "other");
  const file = formData.get("file") as File | null;

  if (!title || !file || file.size === 0) {
    redirect(
      `/dashboard/documents/new?error=${encodeURIComponent(
        "Please provide a title and choose a file to upload."
      )}`
    );
  }

  const allowed = await canActOnCategory(supabase, profile.company_id, category, profile.id, "author");
  if (!allowed) {
    redirect(
      `/dashboard/documents/new?error=${encodeURIComponent(
        "You're not authorized to create documents in this category — see Authorization."
      )}`
    );
  }

  // 1. Create the document record itself.
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      company_id: profile.company_id,
      title,
      document_number: documentNumber || null,
      category,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (documentError || !document) {
    redirect(
      `/dashboard/documents/new?error=${encodeURIComponent(
        documentError?.message ?? "Could not create the document."
      )}`
    );
  }

  // 2. Upload the file to Storage, then record it as version 1.
  const filePath = `${profile.company_id}/${document.id}/v1-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    redirect(
      `/dashboard/documents/new?error=${encodeURIComponent(
        `Document created, but the file failed to upload: ${uploadError.message}`
      )}`
    );
  }

  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .insert({
      document_id: document.id,
      company_id: profile.company_id,
      version_number: 1,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: profile.id,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    redirect(
      `/dashboard/documents/new?error=${encodeURIComponent(
        versionError?.message ?? "Could not record the uploaded file."
      )}`
    );
  }

  await supabase
    .from("documents")
    .update({ current_version_id: version.id })
    .eq("id", document.id);

  revalidatePath("/dashboard/documents");
  redirect(`/dashboard/documents/${document.id}`);
}

export async function addVersion(documentId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(
        "Please choose a file to upload."
      )}`
    );
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("category")
    .eq("id", documentId)
    .single();

  if (doc) {
    const allowed = await canActOnCategory(supabase, profile.company_id, doc.category, profile.id, "author");
    if (!allowed) {
      redirect(
        `/dashboard/documents/${documentId}?error=${encodeURIComponent(
          "You're not authorized to upload new versions in this category — see Authorization."
        )}`
      );
    }
  }

  const { data: existingVersions, error: countError } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (countError) {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(countError.message)}`
    );
  }

  const nextVersionNumber = (existingVersions?.[0]?.version_number ?? 0) + 1;
  const filePath = `${profile.company_id}/${documentId}/v${nextVersionNumber}-${sanitizeFileName(
    file.name
  )}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(uploadError.message)}`
    );
  }

  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
      company_id: profile.company_id,
      version_number: nextVersionNumber,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: profile.id,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(
        versionError?.message ?? "Could not record the uploaded file."
      )}`
    );
  }

  // A new version supersedes any check/approval it had — it hasn't been
  // reviewed yet in this new form, so it goes straight back to Draft.
  await supabase
    .from("documents")
    .update({
      current_version_id: version.id,
      status: "draft",
      checked_by: null,
      checked_at: null,
      approved_by: null,
      approved_at: null,
    })
    .eq("id", documentId);

  revalidatePath(`/dashboard/documents/${documentId}`);
  revalidatePath("/dashboard/documents");
  redirect(`/dashboard/documents/${documentId}`);
}

// Starts revising an APPROVED document — no file picker involved. It
// copies the current version's file forward as the next version (same
// content, new version number) and drops the document back to Draft, so
// there's always something to check/approve, and someone can then use
// "Upload new version" if they actually need to replace the content, or
// just re-approve as-is for something like a routine periodic re-issue.
export async function createRevision(documentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: doc } = await supabase
    .from("documents")
    .select("category, status, current_version_id")
    .eq("id", documentId)
    .single();

  if (!doc) {
    redirect(`/dashboard/documents/${documentId}?error=${encodeURIComponent("Document not found.")}`);
  }
  if (doc.status !== "approved") {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(
        "Only an approved document can be revised this way."
      )}`
    );
  }

  const allowed = await canActOnCategory(supabase, profile.company_id, doc.category, profile.id, "author");
  if (!allowed) {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(
        "You're not authorized to revise documents in this category — see Authorization."
      )}`
    );
  }

  const { data: currentVersion } = await supabase
    .from("document_versions")
    .select("version_number, file_path, file_name, file_size")
    .eq("id", doc.current_version_id)
    .single();

  if (!currentVersion) {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent("Could not find the current version to copy.")}`
    );
  }

  const nextVersionNumber = currentVersion.version_number + 1;
  const newPath = `${profile.company_id}/${documentId}/v${nextVersionNumber}-${sanitizeFileName(currentVersion.file_name)}`;

  const { error: copyError } = await supabase.storage
    .from("documents")
    .copy(currentVersion.file_path, newPath);

  if (copyError) {
    redirect(`/dashboard/documents/${documentId}?error=${encodeURIComponent(copyError.message)}`);
  }

  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
      company_id: profile.company_id,
      version_number: nextVersionNumber,
      file_path: newPath,
      file_name: currentVersion.file_name,
      file_size: currentVersion.file_size,
      uploaded_by: profile.id,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(
        versionError?.message ?? "Could not create the new revision."
      )}`
    );
  }

  await supabase
    .from("documents")
    .update({
      current_version_id: version.id,
      status: "draft",
      checked_by: null,
      checked_at: null,
      approved_by: null,
      approved_at: null,
    })
    .eq("id", documentId);

  revalidatePath(`/dashboard/documents/${documentId}`);
  revalidatePath("/dashboard/documents");
  redirect(`/dashboard/documents/${documentId}`);
}

export async function checkDocument(documentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: doc } = await supabase
    .from("documents")
    .select("category, status")
    .eq("id", documentId)
    .single();

  if (!doc) {
    redirect(`/dashboard/documents/${documentId}?error=${encodeURIComponent("Document not found.")}`);
  }

  const mode = await getWorkflowMode(supabase, profile.company_id, doc.category);
  if (mode !== "check_and_approve") {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(
        "This category doesn't use a separate check step — it goes straight to Approve."
      )}`
    );
  }

  const allowed = await canActOnCategory(supabase, profile.company_id, doc.category, profile.id, "checker");
  if (!allowed) {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(
        "You're not authorized to check documents in this category."
      )}`
    );
  }

  const { error } = await supabase
    .from("documents")
    .update({ status: "checked", checked_by: profile.id, checked_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    redirect(`/dashboard/documents/${documentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/documents/${documentId}`);
  revalidatePath("/dashboard/documents");
  redirect(`/dashboard/documents/${documentId}`);
}

export async function approveDocument(documentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: doc } = await supabase
    .from("documents")
    .select("category, status")
    .eq("id", documentId)
    .single();

  if (!doc) {
    redirect(`/dashboard/documents/${documentId}?error=${encodeURIComponent("Document not found.")}`);
  }

  const mode = await getWorkflowMode(supabase, profile.company_id, doc.category);
  if (mode === "check_and_approve" && doc.status !== "checked") {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(
        "This category requires a check before it can be approved."
      )}`
    );
  }

  const allowed = await canActOnCategory(supabase, profile.company_id, doc.category, profile.id, "approver");
  if (!allowed) {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(
        "You're not authorized to approve documents in this category."
      )}`
    );
  }

  const { error } = await supabase
    .from("documents")
    .update({ status: "approved", approved_by: profile.id, approved_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    redirect(`/dashboard/documents/${documentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/documents/${documentId}`);
  revalidatePath("/dashboard/documents");
  redirect(`/dashboard/documents/${documentId}`);
}

export async function archiveDocument(documentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: doc } = await supabase.from("documents").select("category").eq("id", documentId).single();
  if (!doc) {
    redirect(`/dashboard/documents/${documentId}?error=${encodeURIComponent("Document not found.")}`);
  }

  const allowed = await canActOnCategory(supabase, profile.company_id, doc.category, profile.id, "approver");
  if (!allowed) {
    redirect(
      `/dashboard/documents/${documentId}?error=${encodeURIComponent(
        "You're not authorized to archive documents in this category."
      )}`
    );
  }

  const { error } = await supabase.from("documents").update({ status: "archived" }).eq("id", documentId);

  if (error) {
    redirect(`/dashboard/documents/${documentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/documents/${documentId}`);
  revalidatePath("/dashboard/documents");
  redirect(`/dashboard/documents/${documentId}`);
}

// Sending a document back to Draft is deliberately unrestricted — it's a
// step backward ("something needs fixing"), not a certification, so
// anyone in the company can flag that rather than only an approver.
export async function returnToDraft(documentId: string) {
  const { supabase } = await requireProfile();

  const { error } = await supabase
    .from("documents")
    .update({ status: "draft", checked_by: null, checked_at: null, approved_by: null, approved_at: null })
    .eq("id", documentId);

  if (error) {
    redirect(`/dashboard/documents/${documentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/documents/${documentId}`);
  revalidatePath("/dashboard/documents");
  redirect(`/dashboard/documents/${documentId}`);
}

// "I have read and understood this" — clause 7.3. Insert-only; a repeat
// click (e.g. a race between two tabs) hits the unique constraint on
// (document_version_id, profile_id) and is left as a no-op rather than
// surfaced as an error, since the outcome — "this person has attested" —
// is already true either way.
export async function attestDocument(documentId: string, documentVersionId: string) {
  const { profile, supabase } = await requireProfile();

  await supabase.from("document_attestations").insert({
    company_id: profile.company_id,
    document_version_id: documentVersionId,
    profile_id: profile.id,
  });

  revalidatePath(`/dashboard/documents/${documentId}`);
}
