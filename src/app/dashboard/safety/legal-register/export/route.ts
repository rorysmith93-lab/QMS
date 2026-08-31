import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import { legalCategoryLabel, LEGAL_STATUSES, legalStatusLabel } from "@/lib/legal-register";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status = LEGAL_STATUSES.some((s) => s.value === statusParam) ? statusParam : null;

  let query = supabase
    .from("legal_register_entries")
    .select(
      "title, jurisdiction, regulator, reference_number, description, category, status, last_reviewed_date, next_review_date, notes"
    )
    .order("title", { ascending: true });

  if (status) query = query.eq("status", status);

  const { data: rows, error } = await query;

  if (error) {
    return new NextResponse(`Could not export: ${error.message}`, { status: 500 });
  }

  const csv = toCsv(
    [
      "Title",
      "Jurisdiction",
      "Regulator",
      "Reference Number",
      "Description",
      "Category",
      "Status",
      "Last Reviewed",
      "Next Review Due",
      "Notes",
    ],
    (rows ?? []).map((r) => [
      r.title,
      r.jurisdiction,
      r.regulator,
      r.reference_number,
      r.description,
      legalCategoryLabel(r.category),
      legalStatusLabel(r.status),
      r.last_reviewed_date,
      r.next_review_date,
      r.notes,
    ])
  );

  return csvResponse("legal-register.csv", csv);
}
