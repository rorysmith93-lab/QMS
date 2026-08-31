import type { StatusTone } from "@/components/status-badge";

// Risk Assessments reuse the exact status vocabulary/workflow as SOPs and
// Safety Documents (draft/checked/approved/archived, gated by the Safety
// Documents authorization matrix under the 'risk_assessment' category —
// see src/lib/safety-document-authorization.ts). No separate status file
// needed; these mirror src/lib/safety-documents.ts's labels/tones.
export const RISK_ASSESSMENT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
] as const;

export function riskAssessmentStatusLabel(value: string) {
  if (value === "checked") return "Checked";
  return RISK_ASSESSMENT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function riskAssessmentStatusTone(status: string): StatusTone {
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
// The 5x5 matrix itself. Likelihood x Severity = Score (1-25). Bands are
// intentionally simple constants, not a database concept, so they're easy
// to retune later without a migration — same "derive, don't store" spirit
// as dateStatus()/isOverdue() elsewhere in this app, just applied to a
// same-row product instead of a date.
// ----------------------------------------------------------------------------
export const LIKELIHOOD_LEVELS = [
  { value: 1, label: "Rare" },
  { value: 2, label: "Unlikely" },
  { value: 3, label: "Possible" },
  { value: 4, label: "Likely" },
  { value: 5, label: "Almost Certain" },
] as const;

// OH&S-specific severity, not generic business-impact severity — this is
// about what happens to a person, not to a budget.
export const SEVERITY_LEVELS = [
  { value: 1, label: "Negligible" },
  { value: 2, label: "Minor (first aid)" },
  { value: 3, label: "Moderate (medical treatment)" },
  { value: 4, label: "Major (serious injury)" },
  { value: 5, label: "Catastrophic (fatality)" },
] as const;

export function likelihoodLabel(value: number) {
  return LIKELIHOOD_LEVELS.find((l) => l.value === value)?.label ?? String(value);
}

export function severityLabel(value: number) {
  return SEVERITY_LEVELS.find((s) => s.value === value)?.label ?? String(value);
}

export type RiskBand = "low" | "medium" | "high" | "critical";

// Score bands: 1-4 Low, 5-9 Medium, 10-15 High, 16-25 Critical.
export function riskBandFromScore(score: number): RiskBand {
  if (score >= 16) return "critical";
  if (score >= 10) return "high";
  if (score >= 5) return "medium";
  return "low";
}

export function riskLevelFromScore(score: number): { label: string; tone: StatusTone } {
  const band = riskBandFromScore(score);
  switch (band) {
    case "critical":
      return { label: "Critical", tone: "critical" };
    case "high":
      return { label: "High", tone: "warning" };
    case "medium":
      return { label: "Medium", tone: "info" };
    default:
      return { label: "Low", tone: "positive" };
  }
}

// Solid fill colours for the matrix picker grid — StatusTone's dot colours
// read fine as small dots but are too muted to fill a whole clickable
// cell with readable white text on top, so the picker gets its own small
// palette here instead of reusing STATUS_BADGE's tones directly.
export const RISK_BAND_FILL: Record<RiskBand, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

// ----------------------------------------------------------------------------
// Pre-loaded hazard library — a fixed, code-defined catalog (same
// philosophy as PPE_ITEMS in src/lib/ppe.ts: not something a company
// edits, a quick-start starting point for the "Add hazard" form). A
// per-company editable library is a reasonable future add, not built here.
// ----------------------------------------------------------------------------
export type HazardTemplate = {
  id: string;
  label: string;
  hazardDescription: string;
  whoMightBeHarmed: string;
  existingControls: string;
  initialLikelihood: number;
  initialSeverity: number;
};

export const HAZARD_LIBRARY: HazardTemplate[] = [
  {
    id: "working_at_heights",
    label: "Working at heights",
    hazardDescription: "Fall from height while working on ladders, platforms, or roofs.",
    whoMightBeHarmed: "Workers carrying out the task; others below.",
    existingControls: "Guardrails, harnesses and lanyards, ladder inspection, exclusion zone below.",
    initialLikelihood: 3,
    initialSeverity: 5,
  },
  {
    id: "chemical_handling",
    label: "Chemical handling / exposure",
    hazardDescription: "Skin/eye contact or inhalation of hazardous substances during handling or spills.",
    whoMightBeHarmed: "Workers handling the substance; nearby workers.",
    existingControls: "SDS on file, PPE (gloves/goggles/respirator), ventilation, spill kit available.",
    initialLikelihood: 3,
    initialSeverity: 4,
  },
  {
    id: "manual_handling",
    label: "Manual handling / ergonomics",
    hazardDescription: "Musculoskeletal injury from lifting, carrying, or repetitive movement.",
    whoMightBeHarmed: "Workers performing the task.",
    existingControls: "Manual handling training, mechanical aids (trolleys/hoists), team lifting for heavy items.",
    initialLikelihood: 4,
    initialSeverity: 3,
  },
  {
    id: "electrical",
    label: "Electrical",
    hazardDescription: "Electric shock or burn from contact with live parts or damaged equipment.",
    whoMightBeHarmed: "Workers using or near the equipment.",
    existingControls: "PAT testing, RCDs, lockout/tagout for maintenance, competent-person only for repairs.",
    initialLikelihood: 2,
    initialSeverity: 5,
  },
  {
    id: "machinery",
    label: "Machinery / moving parts",
    hazardDescription: "Entanglement, crushing, or cutting injury from moving machine parts.",
    whoMightBeHarmed: "Machine operators; others nearby.",
    existingControls: "Guarding on all moving parts, emergency stops, lockout/tagout, operator training.",
    initialLikelihood: 3,
    initialSeverity: 4,
  },
  {
    id: "slips_trips_falls",
    label: "Slips, trips and falls (same level)",
    hazardDescription: "Injury from slipping on a wet/contaminated floor or tripping on an obstruction.",
    whoMightBeHarmed: "Anyone walking through the area.",
    existingControls: "Housekeeping, wet-floor signage, cable management, adequate lighting.",
    initialLikelihood: 4,
    initialSeverity: 2,
  },
  {
    id: "noise",
    label: "Noise exposure",
    hazardDescription: "Hearing damage from prolonged exposure to high noise levels.",
    whoMightBeHarmed: "Workers in the noisy area.",
    existingControls: "Hearing protection, noise monitoring, engineering controls where practicable.",
    initialLikelihood: 3,
    initialSeverity: 3,
  },
  {
    id: "fire",
    label: "Fire",
    hazardDescription: "Fire from ignition sources near combustible materials.",
    whoMightBeHarmed: "Everyone on site.",
    existingControls: "Fire extinguishers, alarm system, clear evacuation routes, hot-work permits.",
    initialLikelihood: 2,
    initialSeverity: 5,
  },
  {
    id: "confined_space",
    label: "Confined space entry",
    hazardDescription: "Asphyxiation, entrapment, or exposure to hazardous atmosphere in a confined space.",
    whoMightBeHarmed: "Workers entering the space; rescue personnel.",
    existingControls: "Permit-to-work, gas testing, ventilation, trained attendant, rescue plan.",
    initialLikelihood: 2,
    initialSeverity: 5,
  },
  {
    id: "lone_working",
    label: "Lone working",
    hazardDescription: "Delayed help in the event of an accident or emergency while working alone.",
    whoMightBeHarmed: "The lone worker.",
    existingControls: "Check-in procedure, lone-worker device/app, emergency contact list.",
    initialLikelihood: 3,
    initialSeverity: 3,
  },
];

export function hazardTemplateById(id: string) {
  return HAZARD_LIBRARY.find((h) => h.id === id) ?? null;
}
