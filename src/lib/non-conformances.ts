import type { StatusTone } from "@/components/status-badge";

export const NC_SOURCES = [
  { value: "internal_process", label: "Internal Process" },
  { value: "customer_return", label: "Customer Return" },
  { value: "supplier_issue", label: "Supplier Issue" },
  { value: "internal_audit", label: "Internal Audit" },
] as const;

export const NC_STATUSES = [
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under Review" },
  { value: "disposition_agreed", label: "Disposition Agreed" },
  { value: "verified_closed", label: "Verified & Closed" },
] as const;

export const DISPOSITION_OPTIONS = [
  { value: "scrap", label: "Scrap" },
  { value: "rework", label: "Rework" },
  { value: "repair", label: "Repair" },
  { value: "use_as_is", label: "Use As-Is / Concession" },
  { value: "return_to_vendor", label: "Return to Vendor" },
] as const;

export const ROOT_CAUSE_CATEGORIES = [
  { value: "machine_equipment", label: "Machine / Equipment" },
  { value: "method_sop", label: "Method / SOP" },
  { value: "material", label: "Material" },
  { value: "human_factor", label: "Human Factor" },
  { value: "environment", label: "Environment" },
] as const;

export const REINSPECTION_OUTCOMES = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
] as const;

function labelFrom(list: readonly { value: string; label: string }[], value: string) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export function sourceLabel(value: string) {
  return labelFrom(NC_SOURCES, value);
}

export function ncStatusLabel(value: string) {
  return labelFrom(NC_STATUSES, value);
}

export function dispositionLabel(value: string) {
  return labelFrom(DISPOSITION_OPTIONS, value);
}

export function rootCauseCategoryLabel(value: string) {
  return labelFrom(ROOT_CAUSE_CATEGORIES, value);
}

export function reinspectionOutcomeLabel(value: string) {
  return labelFrom(REINSPECTION_OUTCOMES, value);
}

export function ncStatusTone(status: string): StatusTone {
  switch (status) {
    case "verified_closed":
      return "positive";
    case "disposition_agreed":
      return "info";
    case "under_review":
      return "warning";
    default:
      return "critical"; // open
  }
}

export function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "verified_closed") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}
