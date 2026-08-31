import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import { trainingRecordStatus, trainingTypeLabel, TRAINING_TYPES } from "@/lib/training";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const typeParam = request.nextUrl.searchParams.get("type");
  const type = TRAINING_TYPES.some((t) => t.value === typeParam) ? typeParam : null;
  const statusParam = request.nextUrl.searchParams.get("status");

  let query = supabase
    .from("training_records")
    .select("profile_id, training_title, training_type, provider, completed_date, expiry_date, notes");

  if (type) query = query.eq("training_type", type);

  const { data: rows, error } = await query;

  if (error) {
    return new NextResponse(`Could not export: ${error.message}`, { status: 500 });
  }

  const filtered = (rows ?? []).filter((r) => {
    if (statusParam === "expired") return trainingRecordStatus(r.expiry_date).label === "Expired";
    if (statusParam === "expiring_soon") return trainingRecordStatus(r.expiry_date).label === "Expiring soon";
    return true;
  });

  const profileIds = Array.from(new Set(filtered.map((r) => r.profile_id).filter((v): v is string => Boolean(v))));
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));

  const csv = toCsv(
    ["Team Member", "Training", "Type", "Provider", "Completed Date", "Expiry Date", "Status", "Notes"],
    filtered
      .sort((a, b) => (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""))
      .map((r) => [
        r.profile_id ? nameById.get(r.profile_id) ?? "Former team member" : "Former team member",
        r.training_title,
        trainingTypeLabel(r.training_type),
        r.provider,
        r.completed_date,
        r.expiry_date,
        trainingRecordStatus(r.expiry_date).label,
        r.notes,
      ])
  );

  return csvResponse("training-records.csv", csv);
}
