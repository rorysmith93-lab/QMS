import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import { AUDIT_STATUSES, auditStatusLabel } from "@/lib/internal-audits";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status = AUDIT_STATUSES.some((s) => s.value === statusParam) ? statusParam : null;

  let query = supabase
    .from("internal_audits")
    .select("audit_number, title, process_area, clause_reference, lead_auditor, status, planned_date, actual_date, scope, summary")
    .order("audit_number", { ascending: true });

  if (status) query = query.eq("status", status);

  const { data: rows, error } = await query;

  if (error) {
    return new NextResponse(`Could not export: ${error.message}`, { status: 500 });
  }

  const csv = toCsv(
    [
      "Audit Number",
      "Title",
      "Process/Department Area",
      "Clause(s) Covered",
      "Lead Auditor",
      "Status",
      "Planned Date",
      "Actual Date",
      "Scope/Objective",
      "Summary/Conclusion",
    ],
    (rows ?? []).map((a) => [
      a.audit_number,
      a.title,
      a.process_area,
      a.clause_reference,
      a.lead_auditor,
      auditStatusLabel(a.status),
      a.planned_date,
      a.actual_date,
      a.scope,
      a.summary,
    ])
  );

  return csvResponse("internal-audits.csv", csv);
}
