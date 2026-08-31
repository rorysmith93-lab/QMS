import type { StatusTone } from "@/components/status-badge";

export const RISK_TYPES = [
  { value: "risk", label: "Risk" },
  { value: "opportunity", label: "Opportunity" },
] as const;

export function riskTypeLabel(value: string) {
  return RISK_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function riskTypeTone(value: string): StatusTone {
  return value === "opportunity" ? "info" : "neutral";
}

export const RISK_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export function riskLevelLabel(value: string | null) {
  if (!value) return "—";
  return RISK_LEVELS.find((l) => l.value === value)?.label ?? value;
}

export const RISK_STATUSES = [
  { value: "open", label: "Open" },
  { value: "mitigating", label: "Mitigating" },
  { value: "closed", label: "Closed" },
] as const;

export function riskStatusLabel(value: string) {
  return RISK_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function riskStatusTone(status: string): StatusTone {
  switch (status) {
    case "closed":
      return "positive";
    case "mitigating":
      return "warning";
    default:
      return "neutral"; // open
  }
}

// A simple, non-numeric read on urgency — high likelihood + high impact
// is the one combination worth calling out visually on the list, rather
// than building a full 5x5 scoring matrix a small manufacturer has no
// real use for.
export function isHighPriority(likelihood: string | null, impact: string | null) {
  return likelihood === "high" && impact === "high";
}
