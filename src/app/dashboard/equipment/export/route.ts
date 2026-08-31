import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";
import { calibrationStatus } from "@/lib/calibration";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: items } = await supabase
    .from("equipment_items")
    .select("id, name, requires_calibration")
    .order("name");

  const equipmentList = items ?? [];
  const calibratedIds = equipmentList.filter((i) => i.requires_calibration).map((i) => i.id);

  const { data: calibrations } = calibratedIds.length
    ? await supabase
        .from("equipment_calibrations")
        .select("equipment_item_id, calibrated_date, next_due_date, result")
        .in("equipment_item_id", calibratedIds)
        .order("calibrated_date", { ascending: false })
    : { data: [] as { equipment_item_id: string; calibrated_date: string; next_due_date: string | null; result: string }[] };

  const latestByItem = new Map<string, { calibrated_date: string; next_due_date: string | null; result: string }>();
  for (const record of calibrations ?? []) {
    if (!latestByItem.has(record.equipment_item_id)) latestByItem.set(record.equipment_item_id, record);
  }

  const csv = toCsv(
    ["Name", "Requires Calibration", "Last Calibrated", "Last Result", "Next Due", "Calibration Status"],
    equipmentList.map((item) => {
      const latest = latestByItem.get(item.id);
      const status = item.requires_calibration
        ? latest
          ? calibrationStatus(latest.next_due_date).label
          : "Not calibrated"
        : "";
      return [
        item.name,
        item.requires_calibration ? "Yes" : "No",
        latest?.calibrated_date,
        latest?.result,
        latest?.next_due_date,
        status,
      ];
    })
  );

  return csvResponse("equipment.csv", csv);
}
