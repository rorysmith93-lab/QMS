import type { StatusTone } from "@/components/status-badge";

const DEFAULT_SOON_DAYS = 60;

// Works out whether a date is in the past, coming up soon, or comfortably
// in the future — shared by anything that tracks a "valid until" date
// (training certificate expiry, equipment calibration due dates) so status
// is always derived live from the date rather than stored, and can never
// drift out of sync with reality.
export function dateStatus(
  date: string | null,
  { soonDays = DEFAULT_SOON_DAYS, noDateLabel = "No date set" }: { soonDays?: number; noDateLabel?: string } = {}
): { label: string; tone: StatusTone } {
  if (!date) return { label: noDateLabel, tone: "neutral" };

  const today = new Date(new Date().toDateString());
  const target = new Date(date);
  const daysUntil = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (daysUntil < 0) return { label: "Expired", tone: "critical" };
  if (daysUntil <= soonDays) return { label: "Expiring soon", tone: "warning" };
  return { label: "Valid", tone: "positive" };
}
