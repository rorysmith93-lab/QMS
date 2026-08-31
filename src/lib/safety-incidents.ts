import type { StatusTone } from "@/components/status-badge";

export const INCIDENT_TYPES = [
  { value: "incident", label: "Incident" },
  { value: "near_miss", label: "Near Miss" },
  { value: "hazard_observation", label: "Hazard Observation" },
] as const;

export const INCIDENT_SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const INCIDENT_STATUSES = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "corrective_action", label: "Corrective Action" },
  { value: "closed", label: "Closed" },
] as const;

function labelFrom(list: readonly { value: string; label: string }[], value: string) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export function incidentTypeLabel(value: string) {
  return labelFrom(INCIDENT_TYPES, value);
}

export function incidentSeverityLabel(value: string) {
  return labelFrom(INCIDENT_SEVERITIES, value);
}

export function incidentStatusLabel(value: string) {
  return labelFrom(INCIDENT_STATUSES, value);
}

export function incidentStatusTone(status: string): StatusTone {
  switch (status) {
    case "closed":
      return "positive";
    case "corrective_action":
      return "info";
    case "investigating":
      return "warning";
    default:
      return "critical"; // open
  }
}

export function incidentSeverityTone(severity: string): StatusTone {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "neutral"; // low
  }
}

export function isIncidentOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "closed") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}
