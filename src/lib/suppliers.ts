import type { StatusTone } from "@/components/status-badge";

export const APPROVAL_STATUSES = [
  { value: "approved", label: "Approved" },
  { value: "conditional", label: "Conditional" },
  { value: "under_review", label: "Under Review" },
  { value: "not_approved", label: "Not Approved" },
] as const;

export function approvalStatusLabel(value: string) {
  return APPROVAL_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function approvalStatusTone(status: string): StatusTone {
  switch (status) {
    case "approved":
      return "positive";
    case "conditional":
      return "warning";
    case "not_approved":
      return "critical";
    default:
      return "neutral"; // under_review
  }
}

// Same "overdue if the date's passed and nothing's closed it out" logic
// as equipment calibration and NCR due dates — a supplier with no
// evaluation date on file isn't "overdue" (it just hasn't been scheduled
// yet), only one whose date has actually passed.
export function isEvaluationOverdue(nextEvaluationDate: string | null) {
  if (!nextEvaluationDate) return false;
  return new Date(nextEvaluationDate) < new Date(new Date().toDateString());
}
