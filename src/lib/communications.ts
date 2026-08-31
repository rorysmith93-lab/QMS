import type { StatusTone } from "@/components/status-badge";

export const COMMUNICATION_DIRECTIONS = [
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
] as const;

export function communicationDirectionLabel(value: string) {
  return COMMUNICATION_DIRECTIONS.find((d) => d.value === value)?.label ?? value;
}

export function communicationDirectionTone(value: string): StatusTone {
  return value === "external" ? "info" : "neutral";
}
