import { dateStatus } from "@/lib/dates";

export const TRAINING_TYPES = [
  { value: "induction", label: "Induction" },
  { value: "certification", label: "Certification" },
  { value: "refresher", label: "Refresher" },
  { value: "external_course", label: "External Course" },
  { value: "other", label: "Other" },
] as const;

export function trainingTypeLabel(value: string) {
  return TRAINING_TYPES.find((t) => t.value === value)?.label ?? value;
}

// Validity isn't stored — it's derived from the expiry date every time the
// page renders, so it can never drift out of sync with reality.
export function trainingRecordStatus(expiryDate: string | null) {
  return dateStatus(expiryDate, { noDateLabel: "No expiry" });
}
