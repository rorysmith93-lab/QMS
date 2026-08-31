// Pushes an auto-generated PDF (from publishing a Work Instruction,
// approving a SOP, or publishing a Quality Policy version) into Documents.
// The first call for a given source creates a new Documents entry, already
// "approved" — no separate manual check/approve step, since authorization
// was already enforced by the action that triggered this (approving a work
// instruction/SOP already required approver-level authority; the source
// module's own gating is what matters here, not Documents'). Every later
// call for the SAME source adds a new version to that SAME entry — the
// previous PDF stays in its version history, no longer current, which is
// what "the old one is archived, the new one is added" means in practice
// here: nothing is deleted, the version history is the archive.
//
// Best-effort by design: the caller should treat failures as non-fatal —
// a PDF sync problem shouldn't block someone from approving their work
// instruction/SOP/policy.
import type { createClient } from "@/lib/supabase/server";
import { sanitizeFileName } from "@/lib/files";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type GeneratedDocumentSource = "work_instruction" | "sop" | "quality_policy";

const CATEGORY_BY_SOURCE: Record<GeneratedDocumentSource, string> = {
  work_instruction: "work_instruction",
  sop: "procedure",
  quality_policy: "policy",
};

export async function syncGeneratedDocument(
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
    sourceType: GeneratedDocumentSource;
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
    .from("documents")
    .select("id")
    .eq("generated_from_type", sourceType)
    .eq("generated_from_id", sourceId)
    .maybeSingle();

  let documentId: string;

  if (!existing?.id) {
    const { data: created, error: createError } = await supabase
      .from("documents")
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
      return { error: createError?.message ?? "Could not create the generated document." };
    }
    documentId = created.id;
  } else {
    documentId = existing.id;
    // Keep title/doc number in sync in case they changed on the source
    // since the last approval, and refresh who/when approved it.
    await supabase
      .from("documents")
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
    .from("document_versions")
    .select("version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersionNumber = (existingVersions?.[0]?.version_number ?? 0) + 1;
  const filePath = `${companyId}/${documentId}/v${nextVersionNumber}-${sanitizeFileName(fileName)}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, pdfBuffer, { contentType: "application/pdf" });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
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

  await supabase.from("documents").update({ current_version_id: version.id }).eq("id", documentId);

  return { documentId };
}
