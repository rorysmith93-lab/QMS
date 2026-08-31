import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import { riskAssessmentStatusLabel, riskLevelFromScore } from "@/lib/risk-assessments";

// One row per hazard (flattened across every risk assessment) — easier to
// scan/filter in a spreadsheet than one row per assessment.
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: rows, error } = await supabase
    .from("risk_assessment_hazards")
    .select(
      "position, hazard_description, who_might_be_harmed, existing_controls, initial_likelihood, initial_severity, initial_score, additional_controls, residual_likelihood, residual_severity, residual_score, risk_assessments(title, document_number, area_or_process, status)"
    )
    .order("position", { ascending: true });

  if (error) {
    return new NextResponse(`Could not export: ${error.message}`, { status: 500 });
  }

  const csv = toCsv(
    [
      "Risk Assessment",
      "Document Number",
      "Area / Process",
      "Status",
      "#",
      "Hazard",
      "Who Might Be Harmed",
      "Existing Controls",
      "Initial Likelihood",
      "Initial Severity",
      "Initial Score",
      "Initial Risk Level",
      "Additional Controls",
      "Residual Likelihood",
      "Residual Severity",
      "Residual Score",
      "Residual Risk Level",
    ],
    (rows ?? []).map((h) => {
      const ra = h.risk_assessments as unknown as {
        title: string;
        document_number: string | null;
        area_or_process: string | null;
        status: string;
      } | null;
      return [
        ra?.title ?? "",
        ra?.document_number ?? "",
        ra?.area_or_process ?? "",
        ra ? riskAssessmentStatusLabel(ra.status) : "",
        h.position,
        h.hazard_description,
        h.who_might_be_harmed,
        h.existing_controls,
        h.initial_likelihood,
        h.initial_severity,
        h.initial_score,
        riskLevelFromScore(h.initial_score).label,
        h.additional_controls,
        h.residual_likelihood,
        h.residual_severity,
        h.residual_score,
        riskLevelFromScore(h.residual_score).label,
      ];
    })
  );

  return csvResponse("risk-assessments.csv", csv);
}
