// Renders a PDF snapshot of a Risk Assessment's current (just-approved)
// content — mirrors build-sop-pdf.ts, used by approveRiskAssessment to
// auto-generate the copy that lands in Safety Documents.
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { createClient } from "@/lib/supabase/server";
import { PdfHazard, RiskAssessmentDocument } from "@/lib/pdf/risk-assessment-document";
import { downloadPdfLogoBuffer } from "@/lib/pdf/pdf-logo";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function buildRiskAssessmentPdf(
  supabase: SupabaseServerClient,
  riskAssessmentId: string,
  companyId: string,
  companyLogoPath: string | null
): Promise<{ buffer: Buffer; filename: string } | null> {
  const { data: ra } = await supabase
    .from("risk_assessments")
    .select("title, document_number, area_or_process, assessor, assessment_date, approved_at")
    .eq("id", riskAssessmentId)
    .single();

  if (!ra) return null;

  const { data: hazardRows } = await supabase
    .from("risk_assessment_hazards")
    .select(
      "position, hazard_description, who_might_be_harmed, existing_controls, initial_likelihood, initial_severity, initial_score, additional_controls, residual_likelihood, residual_severity, residual_score"
    )
    .eq("risk_assessment_id", riskAssessmentId)
    .order("position", { ascending: true });

  const { data: versionRows } = await supabase
    .from("risk_assessment_versions")
    .select("version_number")
    .eq("risk_assessment_id", riskAssessmentId)
    .order("version_number", { ascending: false })
    .limit(1);

  const revision = String((versionRows?.[0]?.version_number ?? 0) + 1);

  const logoBuffer = await downloadPdfLogoBuffer(supabase, companyId, companyLogoPath);

  const hazards: PdfHazard[] = (hazardRows ?? []).map((h) => ({
    position: h.position,
    hazardDescription: h.hazard_description,
    whoMightBeHarmed: h.who_might_be_harmed,
    existingControls: h.existing_controls,
    initialLikelihood: h.initial_likelihood,
    initialSeverity: h.initial_severity,
    initialScore: h.initial_score,
    additionalControls: h.additional_controls,
    residualLikelihood: h.residual_likelihood,
    residualSeverity: h.residual_severity,
    residualScore: h.residual_score,
  }));

  const pdfBuffer = await renderToBuffer(
    createElement(RiskAssessmentDocument, {
      title: ra.title,
      documentNumber: ra.document_number,
      revision,
      areaOrProcess: ra.area_or_process,
      assessor: ra.assessor,
      assessmentDateLabel: ra.assessment_date ? new Date(ra.assessment_date).toLocaleDateString() : null,
      approvedDateLabel: ra.approved_at ? new Date(ra.approved_at).toLocaleDateString() : null,
      logoBuffer,
      hazards,
    })
  );

  const filename = `${ra.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v${revision}.pdf`;
  return { buffer: pdfBuffer, filename };
}
