import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import {
  NC_STATUSES,
  sourceLabel,
  ncStatusLabel,
  dispositionLabel,
  rootCauseCategoryLabel,
  reinspectionOutcomeLabel,
} from "@/lib/non-conformances";

// GET /dashboard/non-conformances/export            -> every NCR
// GET /dashboard/non-conformances/export?status=open -> just that status,
// same filter as the currently-viewed list page.
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status = NC_STATUSES.some((s) => s.value === statusParam) ? statusParam : null;

  let query = supabase
    .from("non_conformances")
    .select(
      "ncr_number, title, description, source, status, department, item_or_process, lot_or_serial, quantity_affected, date_reported, reported_by, due_date, containment_action, containment_responsible, containment_date, disposition, disposition_details, capa_required, capa_tracking_number, root_cause_category, root_cause, verification_notes, reinspection_outcome, closed_at"
    )
    .order("ncr_number", { ascending: true });

  if (status) query = query.eq("status", status);

  const { data: rows, error } = await query;

  if (error) {
    return new NextResponse(`Could not export: ${error.message}`, { status: 500 });
  }

  const csv = toCsv(
    [
      "NCR Number",
      "Title",
      "Description",
      "Source of Defect",
      "Status",
      "Department/Location",
      "Item/Process",
      "ID/Lot/Serial",
      "Quantity Affected",
      "Date Reported",
      "Reported By",
      "Due Date",
      "Containment Action",
      "Containment Responsible",
      "Containment Date",
      "Disposition",
      "Disposition Details",
      "CAPA Required",
      "CAPA Tracking Number",
      "Root Cause Category",
      "Root Cause",
      "Verification Notes",
      "Re-Inspection Outcome",
      "Closed Date",
    ],
    (rows ?? []).map((nc) => [
      nc.ncr_number,
      nc.title,
      nc.description,
      sourceLabel(nc.source),
      ncStatusLabel(nc.status),
      nc.department,
      nc.item_or_process,
      nc.lot_or_serial,
      nc.quantity_affected,
      nc.date_reported,
      nc.reported_by,
      nc.due_date,
      nc.containment_action,
      nc.containment_responsible,
      nc.containment_date,
      nc.disposition ? dispositionLabel(nc.disposition) : "",
      nc.disposition_details,
      nc.capa_required ? "Yes" : "No",
      nc.capa_tracking_number,
      nc.root_cause_category ? rootCauseCategoryLabel(nc.root_cause_category) : "",
      nc.root_cause,
      nc.verification_notes,
      nc.reinspection_outcome ? reinspectionOutcomeLabel(nc.reinspection_outcome) : "",
      nc.closed_at,
    ])
  );

  return csvResponse("non-conformances.csv", csv);
}
