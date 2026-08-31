import type { StatusTone } from "@/components/status-badge";

export const OBJECTIVE_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "on_track", label: "On Track" },
  { value: "at_risk", label: "At Risk" },
  { value: "achieved", label: "Achieved" },
  { value: "missed", label: "Missed" },
] as const;

export function objectiveStatusLabel(value: string) {
  return OBJECTIVE_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function objectiveStatusTone(status: string): StatusTone {
  switch (status) {
    case "achieved":
      return "positive";
    case "on_track":
      return "info";
    case "at_risk":
      return "warning";
    case "missed":
      return "critical";
    default:
      return "neutral"; // not_started
  }
}
