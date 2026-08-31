"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/current-profile";
import { sanitizeFileName } from "@/lib/files";
import { canActOnSafetyCategory, getSafetyWorkflowMode } from "@/lib/safety-document-authorization";

const BASE_PATH = "/dashboard/safety/documents";

export async function createSafetyDocument(formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const title = String(formData.get("title") || "").trim();
  const documentNumber = String(formData.get("documentNumber") || "").trim();
  const category = String(formData.get("category") || "other");
  const reviewDueDate = String(formData.get("reviewDueDate") || "");
  const file = formData.get("file") as File | null;

  if (!title || !file || file.size === 0) {
    redirect(
      `${BASE_PATH}/new?error=${encodeURIComponent("Please provide a title and choose a file to upload.")}`
    );
  }

  const allowed = await canActOnSafetyCategory(supabase, profile.company_id, category, profile.id, "author");
  if (!allowed) {
    redirect(
      `${BASE_PATH}/new?error=${encodeURIComponent(
        "You're not authorized to create documents in this category — see Authorization."
      )}`
    );
  }

  const { data: document, error: documentError } = await supabase
    .from("safety_documents")
    .insert({
      company_id: profile.company_id,
      title,
      document_number: documentNumber || null,
      category,
      review_due_date: reviewDueDate || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (documentError || !document) {
    redirect(
      `${BASE_PATH}/new?error=${encodeURIComponent(
        documentError?.message ?? "Could not create the document."
      )}`
    );
  }

  const filePath = `${profile.company_id}/${document.id}/v1-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("safety-documents")
    .upload(filePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    redirect(
      `${BASE_PATH}/new?error=${encodeURIComponent(
        `Document created, but the file failed to upload: ${uploadError.message}`
      )}`
    );
  }

  const { data: version, error: versionError } = await supabase
    .from("safety_document_versions")
    .insert({
      safety_document_id: document.id,
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
      `${BASE_PATH}/new?error=${encodeURIComponent(
        versionError?.message ?? "Could not record the uploaded file."
      )}`
    );
  }

  await supabase.from("safety_documents").update({ current_version_id: version.id }).eq("id", document.id);

  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${document.id}`);
}

export async function addSafetyVersion(documentId: string, formData: FormData) {
  const { profile, supabase } = await requireProfile();

  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent("Please choose a file to upload.")}`);
  }

  const { data: doc } = await supabase
    .from("safety_documents")
    .select("category")
    .eq("id", documentId)
    .single();

  if (doc) {
    const allowed = await canActOnSafetyCategory(supabase, profile.company_id, doc.category, profile.id, "author");
    if (!allowed) {
      redirect(
        `${BASE_PATH}/${documentId}?error=${encodeURIComponent(
          "You're not authorized to upload new versions in this category — see Authorization."
        )}`
      );
    }
  }

  const { data: existingVersions, error: countError } = await supabase
    .from("safety_document_versions")
    .select("version_number")
    .eq("safety_document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (countError) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent(countError.message)}`);
  }

  const nextVersionNumber = (existingVersions?.[0]?.version_number ?? 0) + 1;
  const filePath = `${profile.company_id}/${documentId}/v${nextVersionNumber}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("safety-documents")
    .upload(filePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { data: version, error: versionError } = await supabase
    .from("safety_document_versions")
    .insert({
      safety_document_id: documentId,
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
      `${BASE_PATH}/${documentId}?error=${encodeURIComponent(
        versionError?.message ?? "Could not record the uploaded file."
      )}`
    );
  }

  await supabase
    .from("safety_documents")
    .update({
      current_version_id: version.id,
      status: "draft",
      checked_by: null,
      checked_at: null,
      approved_by: null,
      approved_at: null,
    })
    .eq("id", documentId);

  revalidatePath(`${BASE_PATH}/${documentId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${documentId}`);
}

export async function createSafetyRevision(documentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: doc } = await supabase
    .from("safety_documents")
    .select("category, status, current_version_id")
    .eq("id", documentId)
    .single();

  if (!doc) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent("Document not found.")}`);
  }
  if (doc.status !== "approved") {
    redirect(
      `${BASE_PATH}/${documentId}?error=${encodeURIComponent("Only an approved document can be revised this way.")}`
    );
  }

  const allowed = await canActOnSafetyCategory(supabase, profile.company_id, doc.category, profile.id, "author");
  if (!allowed) {
    redirect(
      `${BASE_PATH}/${documentId}?error=${encodeURIComponent(
        "You're not authorized to revise documents in this category — see Authorization."
      )}`
    );
  }

  const { data: currentVersion } = await supabase
    .from("safety_document_versions")
    .select("version_number, file_path, file_name, file_size")
    .eq("id", doc.current_version_id)
    .single();

  if (!currentVersion) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent("Could not find the current version to copy.")}`);
  }

  const nextVersionNumber = currentVersion.version_number + 1;
  const newPath = `${profile.company_id}/${documentId}/v${nextVersionNumber}-${sanitizeFileName(currentVersion.file_name)}`;

  const { error: copyError } = await supabase.storage
    .from("safety-documents")
    .copy(currentVersion.file_path, newPath);

  if (copyError) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent(copyError.message)}`);
  }

  const { data: version, error: versionError } = await supabase
    .from("safety_document_versions")
    .insert({
      safety_document_id: documentId,
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
      `${BASE_PATH}/${documentId}?error=${encodeURIComponent(versionError?.message ?? "Could not create the new revision.")}`
    );
  }

  await supabase
    .from("safety_documents")
    .update({
      current_version_id: version.id,
      status: "draft",
      checked_by: null,
      checked_at: null,
      approved_by: null,
      approved_at: null,
    })
    .eq("id", documentId);

  revalidatePath(`${BASE_PATH}/${documentId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${documentId}`);
}

export async function checkSafetyDocument(documentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: doc } = await supabase
    .from("safety_documents")
    .select("category, status")
    .eq("id", documentId)
    .single();

  if (!doc) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent("Document not found.")}`);
  }

  const mode = await getSafetyWorkflowMode(supabase, profile.company_id, doc.category);
  if (mode !== "check_and_approve") {
    redirect(
      `${BASE_PATH}/${documentId}?error=${encodeURIComponent(
        "This category doesn't use a separate check step — it goes straight to Approve."
      )}`
    );
  }

  const allowed = await canActOnSafetyCategory(supabase, profile.company_id, doc.category, profile.id, "checker");
  if (!allowed) {
    redirect(
      `${BASE_PATH}/${documentId}?error=${encodeURIComponent("You're not authorized to check documents in this category.")}`
    );
  }

  const { error } = await supabase
    .from("safety_documents")
    .update({ status: "checked", checked_by: profile.id, checked_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${documentId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${documentId}`);
}

export async function approveSafetyDocument(documentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: doc } = await supabase
    .from("safety_documents")
    .select("category, status")
    .eq("id", documentId)
    .single();

  if (!doc) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent("Document not found.")}`);
  }

  const mode = await getSafetyWorkflowMode(supabase, profile.company_id, doc.category);
  if (mode === "check_and_approve" && doc.status !== "checked") {
    redirect(
      `${BASE_PATH}/${documentId}?error=${encodeURIComponent("This category requires a check before it can be approved.")}`
    );
  }

  const allowed = await canActOnSafetyCategory(supabase, profile.company_id, doc.category, profile.id, "approver");
  if (!allowed) {
    redirect(
      `${BASE_PATH}/${documentId}?error=${encodeURIComponent("You're not authorized to approve documents in this category.")}`
    );
  }

  const { error } = await supabase
    .from("safety_documents")
    .update({ status: "approved", approved_by: profile.id, approved_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${documentId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${documentId}`);
}

export async function archiveSafetyDocument(documentId: string) {
  const { profile, supabase } = await requireProfile();

  const { data: doc } = await supabase.from("safety_documents").select("category").eq("id", documentId).single();
  if (!doc) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent("Document not found.")}`);
  }

  const allowed = await canActOnSafetyCategory(supabase, profile.company_id, doc.category, profile.id, "approver");
  if (!allowed) {
    redirect(
      `${BASE_PATH}/${documentId}?error=${encodeURIComponent("You're not authorized to archive documents in this category.")}`
    );
  }

  const { error } = await supabase.from("safety_documents").update({ status: "archived" }).eq("id", documentId);

  if (error) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${documentId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${documentId}`);
}

// Deliberately unrestricted, same reasoning as QMS Documents' returnToDraft.
export async function returnSafetyDocumentToDraft(documentId: string) {
  const { supabase } = await requireProfile();

  const { error } = await supabase
    .from("safety_documents")
    .update({ status: "draft", checked_by: null, checked_at: null, approved_by: null, approved_at: null })
    .eq("id", documentId);

  if (error) {
    redirect(`${BASE_PATH}/${documentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`${BASE_PATH}/${documentId}`);
  revalidatePath(BASE_PATH);
  redirect(`${BASE_PATH}/${documentId}`);
}
