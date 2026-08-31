import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import {
  incidentSeverityLabel,
  incidentStatusLabel,
  incidentTypeLabel,
  INCIDENT_STATUSES,
} from "@/lib/safety-incidents";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status = INCIDENT_STATUSES.some((s) => s.value === statusParam) ? statusParam : null;

  let query = supabase
    .from("safety_incidents")
    .select(
      "incident_number, title, description, type, severity, status, location_text, department, date_occurred, date_reported, injured_person_name, due_date, root_cause, closed_at"
    )
    .order("incident_number", { ascending: true });

  if (status) query = query.eq("status", status);

  const { data: rows, error } = await query;

  if (error) {
    return new NextResponse(`Could not export: ${error.message}`, { status: 500 });
  }

  const csv = toCsv(
    [
      "Incident Number",
      "Title",
      "Description",
      "Type",
      "Severity",
      "Status",
      "Location",
      "Department",
      "Date Occurred",
      "Date Reported",
      "Injured Person",
      "Due Date",
      "Root Cause",
      "Closed Date",
    ],
    (rows ?? []).map((r) => [
      r.incident_number,
      r.title,
      r.description,
      incidentTypeLabel(r.type),
      incidentSeverityLabel(r.severity),
      incidentStatusLabel(r.status),
      r.location_text,
      r.department,
      r.date_occurred,
      r.date_reported,
      r.injured_person_name,
      r.due_date,
      r.root_cause,
      r.closed_at,
    ])
  );

  return csvResponse("safety-incidents.csv", csv);
}
