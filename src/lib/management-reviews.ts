import type { StatusTone } from "@/components/status-badge";

export const REVIEW_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
] as const;

export function reviewStatusLabel(value: string) {
  return REVIEW_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function reviewStatusTone(status: string): StatusTone {
  return status === "completed" ? "positive" : "neutral";
}

// The clause 9.3.2 input fields and clause 9.3.3 output fields, in the
// order a reviewer would work through them — shared by the form and the
// read-only summary so both stay in sync with the standard.
export const REVIEW_INPUT_FIELDS = [
  {
    key: "previous_actions_status",
    label: "Status of actions from previous management reviews",
    hint: "Were the follow-ups from last time actually completed?",
  },
  {
    key: "context_changes",
    label: "Changes in external and internal issues relevant to the QMS",
    hint: "New regulations, market conditions, staffing, equipment, etc.",
  },
  {
    key: "customer_feedback",
    label: "Customer satisfaction and feedback",
    hint: "Complaints, returns, survey results, praise.",
  },
  {
    key: "objectives_performance",
    label: "Extent to which quality objectives have been met",
  },
  {
    key: "nc_capa_summary",
    label: "Process performance, nonconformities, and corrective actions",
    hint: "See the live snapshot above for current counts.",
  },
  {
    key: "audit_summary",
    label: "Audit results",
    hint: "See the live snapshot above for current counts.",
  },
  {
    key: "resource_adequacy",
    label: "Adequacy of resources",
  },
  {
    key: "risk_opportunity_effectiveness",
    label: "Effectiveness of actions taken to address risks and opportunities",
    hint: "See the live snapshot above, and the full Risk Register for detail on each item.",
  },
] as const;

export const REVIEW_OUTPUT_FIELDS = [
  {
    key: "improvement_opportunities",
    label: "Opportunities for improvement",
  },
  {
    key: "qms_changes_needed",
    label: "Need for changes to the QMS",
  },
  {
    key: "resource_needs",
    label: "Resource needs",
  },
] as const;
