import { dateStatus } from "@/lib/dates";
import type { StatusTone } from "@/components/status-badge";

export const CALIBRATION_RESULTS = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "adjusted", label: "Adjusted" },
] as const;

export function calibrationResultLabel(value: string) {
  return CALIBRATION_RESULTS.find((r) => r.value === value)?.label ?? value;
}

export function calibrationResultTone(value: string): StatusTone {
  switch (value) {
    case "fail":
      return "critical";
    case "adjusted":
      return "warning";
    default:
      return "positive"; // pass
  }
}

// Due-date validity, same "Valid / Expiring soon / Expired" logic as
// training certificates. "Not yet calibrated" is handled separately by the
// caller — it applies when an item requires calibration but has no record
// on file at all, which isn't something a single date can express.
export function calibrationStatus(nextDueDate: string | null) {
  return dateStatus(nextDueDate, { noDateLabel: "No due date set" });
}
