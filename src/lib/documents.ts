import type { StatusTone } from "@/components/status-badge";

export const DOCUMENT_CATEGORIES = [
  { value: "policy", label: "Policy" },
  { value: "procedure", label: "Procedure" },
  { value: "work_instruction", label: "Work Instruction" },
  { value: "form", label: "Form" },
  { value: "other", label: "Other" },
] as const;

// Used as the dropdown OPTIONS for Work Instructions' own (unrelated)
// status field, which only ever has these three values — don't add
// 'checked' here, it would let someone try to set a work instruction to a
// status its own check constraint doesn't allow. Documents no longer uses
// this for its own status control (see the Check/Approve/Archive actions
// on the document detail page) — statusLabel/statusTone below do handle
// 'checked', since those are just display lookups, safe either way.
export const DOCUMENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
] as const;

export function categoryLabel(value: string) {
  return DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// Labels/links for a Documents entry that was auto-generated as a PDF from
// another module (see src/lib/generated-documents.ts), rather than
// uploaded by hand.
const GENERATED_SOURCE_LABELS: Record<string, string> = {
  work_instruction: "Work Instruction",
  sop: "SOP",
  quality_policy: "Quality Policy",
};

export function generatedSourceLabel(sourceType: string) {
  return GENERATED_SOURCE_LABELS[sourceType] ?? sourceType;
}

export function generatedSourceHref(sourceType: string, sourceId: string) {
  if (sourceType === "work_instruction") return `/dashboard/work-instructions/${sourceId}`;
  if (sourceType === "sop") return `/dashboard/sops/${sourceId}`;
  if (sourceType === "quality_policy") return "/dashboard/quality-policy";
  return "/dashboard/documents";
}

export function statusLabel(value: string) {
  if (value === "checked") return "Checked";
  return DOCUMENT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function statusTone(status: string): StatusTone {
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

// ----------------------------------------------------------------------------
// Document authorization matrix — see document_authorization_schema.sql.
// ----------------------------------------------------------------------------
export const AUTHORIZATION_LEVELS = [
  { value: "author", label: "Author" },
  { value: "checker", label: "Checker" },
  { value: "approver", label: "Approver" },
] as const;

export const WORKFLOW_MODES = [
  { value: "just_approve", label: "Just approve" },
  { value: "check_and_approve", label: "Check, then approve" },
] as const;

export function authorizationLevelLabel(value: string) {
  return AUTHORIZATION_LEVELS.find((l) => l.value === value)?.label ?? value;
}

export function workflowModeLabel(value: string) {
  return WORKFLOW_MODES.find((m) => m.value === value)?.label ?? value;
}
