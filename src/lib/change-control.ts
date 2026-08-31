import type { StatusTone } from "@/components/status-badge";

export const CHANGE_STATUSES = [
  { value: "proposed", label: "Proposed" },
  { value: "approved", label: "Approved" },
  { value: "implemented", label: "Implemented" },
  { value: "rejected", label: "Rejected" },
] as const;

export function changeStatusLabel(value: string) {
  return CHANGE_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function changeStatusTone(status: string): StatusTone {
  switch (status) {
    case "implemented":
      return "positive";
    case "approved":
      return "info";
    case "rejected":
      return "critical";
    default:
      return "neutral"; // proposed
  }
}
