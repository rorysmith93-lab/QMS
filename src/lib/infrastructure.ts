import { dateStatus } from "@/lib/dates";

export const INFRASTRUCTURE_CATEGORIES = [
  { value: "building", label: "Building & utilities" },
  { value: "production_equipment", label: "Production equipment" },
  { value: "it_system", label: "IT system" },
  { value: "vehicle", label: "Vehicle" },
  { value: "other", label: "Other" },
] as const;

export function infrastructureCategoryLabel(value: string) {
  return INFRASTRUCTURE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// Same "Valid / Expiring soon / Expired" read as equipment calibration due
// dates — see src/lib/calibration.ts and src/lib/dates.ts.
export function maintenanceStatus(nextDueDate: string | null) {
  return dateStatus(nextDueDate, { noDateLabel: "No due date set" });
}
