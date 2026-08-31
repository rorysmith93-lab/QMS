import type { StatusTone } from "@/components/status-badge";

export const LEGAL_CATEGORIES = [
  { value: "osha_hse", label: "OSHA / HSE" },
  { value: "environmental", label: "Environmental" },
  { value: "industry_code", label: "Industry Code" },
  { value: "local", label: "Local / Municipal" },
  { value: "other", label: "Other" },
] as const;

export const LEGAL_STATUSES = [
  { value: "compliant", label: "Compliant" },
  { value: "non_compliant", label: "Non-Compliant" },
  { value: "in_progress", label: "In Progress" },
  { value: "not_applicable", label: "Not Applicable" },
] as const;

export function legalCategoryLabel(value: string) {
  return LEGAL_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function legalStatusLabel(value: string) {
  return LEGAL_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function legalStatusTone(status: string): StatusTone {
  switch (status) {
    case "compliant":
      return "positive";
    case "in_progress":
      return "warning";
    case "not_applicable":
      return "neutral";
    default:
      return "critical"; // non_compliant
  }
}

export type ComplianceChecklistItem = {
  item: string;
  result: "pass" | "fail" | "na";
  notes: string;
};

export function emptyChecklistItem(): ComplianceChecklistItem {
  return { item: "", result: "pass", notes: "" };
}
