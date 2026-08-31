import type { StatusTone } from "@/components/status-badge";

export const CAPA_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

export function capaStatusLabel(value: string) {
  return CAPA_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function capaStatusTone(status: string): StatusTone {
  switch (status) {
    case "completed":
      return "positive";
    case "in_progress":
      return "info";
    default:
      return "warning"; // open
  }
}

// "Escalation" is this: overdue is derived at render time from due_date/
// status, same as every other due-date badge in this app — there's no
// notification/cron infrastructure to actually push an alert.
export function isCapaOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}
