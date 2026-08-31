import { createElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  PdfShopfloorHazard,
  RiskAssessmentShopfloorDocument,
} from "@/lib/pdf/risk-assessment-shopfloor-document";
import { downloadPdfLogoBuffer } from "@/lib/pdf/pdf-logo";

// GET /dashboard/safety/risk-assessments/[id]/pdf — the shopfloor print
// export (landscape, boxed title, one table row per hazard). Separate
// from the portrait record filed automatically into Safety Documents on
// approval (src/lib/pdf/risk-assessment-document.tsx) — this one is
// rendered on demand, not stored, and opened inline so the browser's own
// PDF viewer can print it directly.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, companies(logo_path)")
    .eq("id", user.id)
    .single<{ company_id: string; companies: { logo_path: string | null } | null }>();

  if (!profile) {
    return new NextResponse("Not found", { status: 404 });
  }

  // RLS already scopes this to the caller's own company.
  const { data: ra } = await supabase
    .from("risk_assessments")
    .select("title, document_number, area_or_process, assessor, assessment_date, review_due_date, approved_at")
    .eq("id", id)
    .single();

  if (!ra) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [{ data: hazardRows }, { data: versionRows }] = await Promise.all([
    supabase
      .from("risk_assessment_hazards")
      .select(
        "position, hazard_description, who_might_be_harmed, existing_controls, initial_likelihood, initial_severity, initial_score, additional_controls, residual_likelihood, residual_severity, residual_score"
      )
      .eq("risk_assessment_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("risk_assessment_versions")
      .select("version_number")
      .eq("risk_assessment_id", id)
      .order("version_number", { ascending: false })
      .limit(1),
  ]);

  const revision = String((versionRows?.[0]?.version_number ?? 0) + 1);

  const hazards: PdfShopfloorHazard[] = (hazardRows ?? []).map((h) => ({
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

  const logoBuffer = await downloadPdfLogoBuffer(supabase, profile.company_id, profile.companies?.logo_path ?? null);

  const pdfBuffer = await renderToBuffer(
    createElement(RiskAssessmentShopfloorDocument, {
      title: ra.title,
      documentNumber: ra.document_number,
      revision,
      areaOrProcess: ra.area_or_process,
      assessor: ra.assessor,
      assessmentDateLabel: ra.assessment_date ? new Date(ra.assessment_date).toLocaleDateString() : null,
      approvedDateLabel: ra.approved_at ? new Date(ra.approved_at).toLocaleDateString() : null,
      reviewDueDateLabel: ra.review_due_date ? new Date(ra.review_due_date).toLocaleDateString() : null,
      logoBuffer,
      hazards,
    })
  );

  const filename = `${ra.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-shopfloor.pdf`;

  // Inline, not attachment — this is meant to be opened in a new tab and
  // printed straight from the browser's own PDF viewer, not downloaded.
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
