import type { StatusTone } from "@/components/status-badge";

export const AUDIT_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
] as const;

export const FINDING_TYPES = [
  { value: "nonconformity", label: "Nonconformity" },
  { value: "observation", label: "Observation" },
  { value: "opportunity_for_improvement", label: "Opportunity for Improvement" },
] as const;

export const FINDING_STATUSES = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
] as const;

function labelFrom(list: readonly { value: string; label: string }[], value: string) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export function auditStatusLabel(value: string) {
  return labelFrom(AUDIT_STATUSES, value);
}

export function findingTypeLabel(value: string) {
  return labelFrom(FINDING_TYPES, value);
}

export function findingStatusLabel(value: string) {
  return labelFrom(FINDING_STATUSES, value);
}

export function auditStatusTone(status: string): StatusTone {
  switch (status) {
    case "closed":
      return "positive";
    case "completed":
      return "info";
    case "in_progress":
      return "warning";
    default:
      return "neutral"; // planned
  }
}

export function findingTypeTone(type: string): StatusTone {
  switch (type) {
    case "nonconformity":
      return "critical";
    case "opportunity_for_improvement":
      return "info";
    default:
      return "warning"; // observation
  }
}

export function findingStatusTone(status: string): StatusTone {
  return status === "closed" ? "positive" : "critical";
}
