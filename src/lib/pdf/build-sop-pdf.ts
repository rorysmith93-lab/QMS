// Renders a PDF snapshot of a SOP's current (just-approved) content —
// used by approveSop to auto-generate the copy that lands in Documents.
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { createClient } from "@/lib/supabase/server";
import { PdfSopStep, SopDocument } from "@/lib/pdf/sop-document";
import { downloadPdfLogoBuffer } from "@/lib/pdf/pdf-logo";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function buildSopPdf(
  supabase: SupabaseServerClient,
  sopId: string,
  companyId: string,
  companyLogoPath: string | null
): Promise<{ buffer: Buffer; filename: string } | null> {
  const { data: sop } = await supabase
    .from("sops")
    .select("title, document_number, purpose, scope, responsibilities, reference_notes, approved_at")
    .eq("id", sopId)
    .single();

  if (!sop) return null;

  const { data: stepRows } = await supabase
    .from("sop_steps")
    .select("position, description, work_instructions(title, document_number)")
    .eq("sop_id", sopId)
    .order("position", { ascending: true });

  const { data: versionRows } = await supabase
    .from("sop_versions")
    .select("version_number")
    .eq("sop_id", sopId)
    .order("version_number", { ascending: false })
    .limit(1);

  // The SOP's own revision counter — every past approved wording is
  // snapshotted into sop_versions on revise, so "how many times has this
  // been revised" is just that count, +1 for the version now in effect.
  const revision = String((versionRows?.[0]?.version_number ?? 0) + 1);

  const logoBuffer = await downloadPdfLogoBuffer(supabase, companyId, companyLogoPath);

  const steps: PdfSopStep[] = (stepRows ?? []).map((step) => {
    const wi = step.work_instructions as unknown as { title: string; document_number: string | null } | null;
    return {
      description: step.description,
      linkedWorkInstructionLabel: wi ? (wi.document_number ? `${wi.document_number} — ${wi.title}` : wi.title) : null,
    };
  });

  const pdfBuffer = await renderToBuffer(
    createElement(SopDocument, {
      title: sop.title,
      documentNumber: sop.document_number,
      revision,
      approvedDateLabel: sop.approved_at ? new Date(sop.approved_at).toLocaleDateString() : null,
      logoBuffer,
      purpose: sop.purpose,
      scope: sop.scope,
      responsibilities: sop.responsibilities,
      referenceNotes: sop.reference_notes,
      steps,
    })
  );

  const filename = `${sop.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v${revision}.pdf`;
  return { buffer: pdfBuffer, filename };
}
