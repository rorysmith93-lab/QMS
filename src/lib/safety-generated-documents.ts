// Pushes an auto-generated PDF (currently: approving a Risk Assessment)
// into Safety Documents. Parallel to src/lib/generated-documents.ts, which
// does the same thing for QMS Documents — duplicated rather than shared
// because Safety Documents deliberately lives in its own tables
// (safety_documents/safety_document_versions), not QMS's documents/
// document_versions (see safety_documents_schema.sql for why).
//
// Same contract as the QMS version: first call for a given source creates
// a new Safety Documents entry, already "approved" (the source module's
// own authorization already gated this); every later call for the SAME
// source adds a new version to that same entry. Best-effort by design —
// callers should swallow errors rather than let a PDF/sync failure undo
// an already-committed approval.
import type { createClient } from "@/lib/supabase/server";
import { sanitizeFileName } from "@/lib/files";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type GeneratedSafetyDocumentSource = "risk_assessment";

const CATEGORY_BY_SOURCE: Record<GeneratedSafetyDocumentSource, string> = {
  risk_assessment: "risk_assessment",
};

export async function syncSafetyGeneratedDocument(
  supabase: SupabaseServerClient,
  {
    companyId,
    sourceType,
    sourceId,
    title,
    documentNumber,
    pdfBuffer,
    fileName,
    actorId,
  }: {
    companyId: string;
    sourceType: GeneratedSafetyDocumentSource;
    sourceId: string;
    title: string;
    documentNumber: string | null;
    pdfBuffer: Buffer;
    fileName: string;
    actorId: string;
  }
): Promise<{ documentId: string } | { error: string }> {
  const category = CATEGORY_BY_SOURCE[sourceType];

  const { data: existing } = await supabase
    .from("safety_documents")
    .select("id")
    .eq("generated_from_type", sourceType)
    .eq("generated_from_id", sourceId)
    .maybeSingle();

  let documentId: string;

  if (!existing?.id) {
    const { data: created, error: createError } = await supabase
      .from("safety_documents")
      .insert({
        company_id: companyId,
        title,
        document_number: documentNumber,
        category,
        created_by: actorId,
        status: "approved",
        approved_by: actorId,
        approved_at: new Date().toISOString(),
        generated_from_type: sourceType,
        generated_from_id: sourceId,
      })
      .select("id")
      .single();

    if (createError || !created) {
      return { error: createError?.message ?? "Could not create the generated safety document." };
    }
    documentId = created.id;
  } else {
    documentId = existing.id;
    await supabase
      .from("safety_documents")
      .update({
        title,
        document_number: documentNumber,
        status: "approved",
        approved_by: actorId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", documentId);
  }

  const { data: existingVersions } = await supabase
    .from("safety_document_versions")
    .select("version_number")
    .eq("safety_document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersionNumber = (existingVersions?.[0]?.version_number ?? 0) + 1;
  const filePath = `${companyId}/${documentId}/v${nextVersionNumber}-${sanitizeFileName(fileName)}`;

  const { error: uploadError } = await supabase.storage
    .from("safety-documents")
    .upload(filePath, pdfBuffer, { contentType: "application/pdf" });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: version, error: versionError } = await supabase
    .from("safety_document_versions")
    .insert({
      safety_document_id: documentId,
      company_id: companyId,
      version_number: nextVersionNumber,
      file_path: filePath,
      file_name: fileName,
      file_size: pdfBuffer.byteLength,
      uploaded_by: actorId,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    return { error: versionError?.message ?? "Could not record the generated PDF." };
  }

  await supabase.from("safety_documents").update({ current_version_id: version.id }).eq("id", documentId);

  return { documentId };
}
