import type { StatusTone } from "@/components/status-badge";

export const SAFETY_DOCUMENT_CATEGORIES = [
  { value: "ohs_policy", label: "OH&S Policy" },
  { value: "risk_assessment", label: "Risk Assessment" },
  { value: "procedure", label: "Procedure" },
  { value: "permit_to_work", label: "Permit to Work" },
  { value: "contractor_agreement", label: "Contractor Agreement" },
  { value: "other", label: "Other" },
] as const;

export const SAFETY_DOCUMENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
] as const;

export function safetyCategoryLabel(value: string) {
  return SAFETY_DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function safetyStatusLabel(value: string) {
  if (value === "checked") return "Checked";
  return SAFETY_DOCUMENT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function safetyStatusTone(status: string): StatusTone {
  switch (status) {
    case "approved":
      return "positive";
    case "checked":
      return "info";
    case "archived":
      return "neutral";
    default:
      return "warning"; // draft
  }
}

// A couple of pre-written starters for the "new document" page — the
// user fills these in and uploads as v1. Not a structured builder (like
// the SOP module); that's a reasonable Phase 2/3 add if wanted later.
export const SAFETY_DOCUMENT_TEMPLATES = [
  {
    id: "ohs_policy",
    label: "OH&S Policy",
    category: "ohs_policy" as const,
    body: `[COMPANY NAME] — Occupational Health & Safety Policy

Purpose
This policy sets out our commitment to the health, safety, and welfare of everyone affected by our work.

Scope
Applies to all employees, contractors, and visitors at [SITE/LOCATION].

Commitments
- Comply with applicable OH&S legislation and other requirements we subscribe to.
- Provide safe working conditions and prevent work-related injury and ill health.
- Consult and involve workers in OH&S decisions that affect them.
- Continually improve the OH&S management system.

Responsibilities
[Who owns what — leadership, managers, workers]

Review
This policy is reviewed at planned intervals and after significant change.

Signed: _______________________   Date: _______________`,
  },
  {
    id: "scope_document",
    label: "OH&S Management System Scope",
    category: "ohs_policy" as const,
    body: `[COMPANY NAME] — OH&S Management System Scope

Boundaries and applicability of the OH&S management system, including the activities, products, and services covered, and the physical locations of the organization's activities.

Sites/locations covered:
[List]

Activities covered:
[List]

Exclusions (with justification, if any):
[List]`,
  },
  {
    id: "mgmt_review_agenda",
    label: "Management Review Agenda (Clause 9.3)",
    category: "procedure" as const,
    body: `[COMPANY NAME] — OH&S Management Review Agenda

Date: _______________   Attendees: _______________

1. Status of actions from previous management reviews
2. Changes in external/internal issues relevant to the OH&S management system
3. Extent to which OH&S policy and objectives have been met
4. Information on OH&S performance, including trends in: incidents, non-conformities, corrective actions, monitoring/measurement results, audit results, consultation/participation of workers
5. Adequacy of resources for maintaining an effective OH&S management system
6. Relevant communication(s) with interested parties
7. Opportunities for continual improvement
8. Outputs: conclusions on continuing suitability/adequacy/effectiveness, decisions on opportunities for improvement, decisions on any need for changes, resource needs, actions, implications for strategic direction`,
  },
] as const;

// ----------------------------------------------------------------------------
// Authorization matrix labels — reuses the exact same level/mode vocabulary
// as QMS Documents (src/lib/documents.ts), just re-exported here so this
// module doesn't have to import from the QMS-specific file.
// ----------------------------------------------------------------------------
export const SAFETY_AUTHORIZATION_LEVELS = [
  { value: "author", label: "Author" },
  { value: "checker", label: "Checker" },
  { value: "approver", label: "Approver" },
] as const;

export const SAFETY_WORKFLOW_MODES = [
  { value: "just_approve", label: "Just approve" },
  { value: "check_and_approve", label: "Check, then approve" },
] as const;

export function safetyAuthorizationLevelLabel(value: string) {
  return SAFETY_AUTHORIZATION_LEVELS.find((l) => l.value === value)?.label ?? value;
}

export function safetyWorkflowModeLabel(value: string) {
  return SAFETY_WORKFLOW_MODES.find((m) => m.value === value)?.label ?? value;
}
