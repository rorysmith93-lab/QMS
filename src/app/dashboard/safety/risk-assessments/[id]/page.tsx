import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import {
  addHazard,
  approveRiskAssessment,
  archiveRiskAssessment,
  checkRiskAssessment,
  deleteHazard,
  moveHazardDown,
  moveHazardUp,
  returnRiskAssessmentToDraft,
  reviseRiskAssessment,
  updateHazard,
  updateRiskAssessmentMeta,
} from "@/app/dashboard/safety/risk-assessments/actions";
import { ConfirmSubmitButton } from "@/app/dashboard/work-instructions/confirm-submit-button";
import { canActOnSafetyCategory, getSafetyWorkflowMode } from "@/lib/safety-document-authorization";
import { riskAssessmentStatusLabel, riskAssessmentStatusTone, riskLevelFromScore } from "@/lib/risk-assessments";
import { StatusBadge } from "@/components/status-badge";
import { RiskMatrixPicker } from "@/components/risk-matrix-picker";
import { HazardQuickAddForm } from "@/components/hazard-quick-add-form";

type RiskAssessmentRow = {
  id: string;
  title: string;
  document_number: string | null;
  area_or_process: string | null;
  assessor: string | null;
  assessment_date: string;
  review_due_date: string | null;
  status: string;
  checked_by: string | null;
  checked_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
};

type HazardRow = {
  id: string;
  position: number;
  hazard_description: string;
  who_might_be_harmed: string | null;
  existing_controls: string | null;
  initial_likelihood: number;
  initial_severity: number;
  initial_score: number;
  additional_controls: string | null;
  residual_likelihood: number;
  residual_severity: number;
  residual_score: number;
};

type VersionRow = {
  id: string;
  version_number: number;
  snapshotted_by: string | null;
  snapshotted_at: string;
};

const RA_CATEGORY = "risk_assessment";

export default async function RiskAssessmentBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const { data: ra } = await supabase
    .from("risk_assessments")
    .select(
      "id, title, document_number, area_or_process, assessor, assessment_date, review_due_date, status, checked_by, checked_at, approved_by, approved_at"
    )
    .eq("id", id)
    .single<RiskAssessmentRow>();

  if (!ra) {
    notFound();
  }

  const [workflowMode, canCheck, canApprove, canAuthor] = await Promise.all([
    getSafetyWorkflowMode(supabase, profile.company_id, RA_CATEGORY),
    canActOnSafetyCategory(supabase, profile.company_id, RA_CATEGORY, profile.id, "checker"),
    canActOnSafetyCategory(supabase, profile.company_id, RA_CATEGORY, profile.id, "approver"),
    canActOnSafetyCategory(supabase, profile.company_id, RA_CATEGORY, profile.id, "author"),
  ]);

  const [{ data: hazards }, { data: versions }] = await Promise.all([
    supabase
      .from("risk_assessment_hazards")
      .select(
        "id, position, hazard_description, who_might_be_harmed, existing_controls, initial_likelihood, initial_severity, initial_score, additional_controls, residual_likelihood, residual_severity, residual_score"
      )
      .eq("risk_assessment_id", id)
      .order("position", { ascending: true })
      .returns<HazardRow[]>(),
    supabase
      .from("risk_assessment_versions")
      .select("id, version_number, snapshotted_by, snapshotted_at")
      .eq("risk_assessment_id", id)
      .order("version_number", { ascending: false })
      .returns<VersionRow[]>(),
  ]);

  const trailProfileIds = Array.from(
    new Set(
      [ra.checked_by, ra.approved_by, ...(versions ?? []).map((v) => v.snapshotted_by)].filter(
        (v): v is string => Boolean(v)
      )
    )
  );
  const { data: trailProfiles } = trailProfileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", trailProfileIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const trailNameById = new Map((trailProfiles ?? []).map((p) => [p.id, p.full_name || "Someone"]));

  const boundUpdateMeta = updateRiskAssessmentMeta.bind(null, ra.id);
  const boundAddHazard = addHazard.bind(null, ra.id);
  const boundCheck = checkRiskAssessment.bind(null, ra.id);
  const boundApprove = approveRiskAssessment.bind(null, ra.id);
  const boundArchive = archiveRiskAssessment.bind(null, ra.id);
  const boundReturnToDraft = returnRiskAssessmentToDraft.bind(null, ra.id);
  const boundRevise = reviseRiskAssessment.bind(null, ra.id);

  const showCheckButton = workflowMode === "check_and_approve" && ra.status === "draft" && canCheck;
  const showApproveButton =
    canApprove && (workflowMode === "check_and_approve" ? ra.status === "checked" : ra.status === "draft");
  const showArchiveButton = canApprove && ra.status === "approved";
  const showReturnToDraftButton = ra.status === "checked";
  const showReviseButton = ra.status === "approved" && canAuthor;

  const highestResidual = (hazards ?? []).length
    ? Math.max(...(hazards ?? []).map((h) => h.residual_score))
    : null;
  const highestLevel = highestResidual !== null ? riskLevelFromScore(highestResidual) : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/safety/risk-assessments" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to risk assessments
      </Link>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{ra.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge label={riskAssessmentStatusLabel(ra.status)} tone={riskAssessmentStatusTone(ra.status)} />
            {highestLevel && (
              <StatusBadge label={`Highest residual risk: ${highestResidual} — ${highestLevel.label}`} tone={highestLevel.tone} />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showCheckButton && (
            <form action={boundCheck}>
              <button type="submit" className="btn-secondary">
                Mark as checked
              </button>
            </form>
          )}
          {showApproveButton && (
            <form action={boundApprove}>
              <button type="submit" className="btn-primary">
                Approve
              </button>
            </form>
          )}
          {ra.status === "approved" && (
            <a
              href={`/dashboard/safety/risk-assessments/${ra.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Export to PDF
            </a>
          )}
          {showReviseButton && (
            <form action={boundRevise}>
              <button type="submit" className="btn-secondary">
                Revise
              </button>
            </form>
          )}
          {showArchiveButton && (
            <form action={boundArchive}>
              <button type="submit" className="btn-secondary">
                Archive
              </button>
            </form>
          )}
          {showReturnToDraftButton && (
            <form action={boundReturnToDraft}>
              <button type="submit" className="btn-secondary">
                Return to draft
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {ra.checked_by && ra.checked_at && (
          <span className="text-xs text-faint">
            Checked by {trailNameById.get(ra.checked_by)} on {new Date(ra.checked_at).toLocaleDateString()}
          </span>
        )}
        {ra.approved_by && ra.approved_at && (
          <span className="text-xs text-faint">
            Approved by {trailNameById.get(ra.approved_by)} on {new Date(ra.approved_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {!showCheckButton && !showApproveButton && ra.status !== "approved" && ra.status !== "archived" && (
        <p className="mt-1 text-xs text-faint">
          {workflowMode === "check_and_approve" && ra.status === "draft" && !canCheck
            ? "Waiting on someone authorized to check this category — see Safety Documents → Authorization."
            : workflowMode !== "check_and_approve" && ra.status === "draft" && !canApprove
              ? "Waiting on someone authorized to approve this category — see Safety Documents → Authorization."
              : null}
        </p>
      )}

      <form action={boundUpdateMeta} className="surface mt-4 space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
              Title
            </label>
            <input id="title" name="title" type="text" required defaultValue={ra.title} className="field mt-1" />
          </div>
          <div>
            <label htmlFor="documentNumber" className="block text-sm font-medium text-[var(--text-primary)]">
              Document number
            </label>
            <input
              id="documentNumber"
              name="documentNumber"
              type="text"
              defaultValue={ra.document_number ?? ""}
              className="field mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="areaOrProcess" className="block text-sm font-medium text-[var(--text-primary)]">
              Area / process
            </label>
            <input
              id="areaOrProcess"
              name="areaOrProcess"
              type="text"
              defaultValue={ra.area_or_process ?? ""}
              className="field mt-1"
            />
          </div>
          <div>
            <label htmlFor="assessor" className="block text-sm font-medium text-[var(--text-primary)]">
              Assessor
            </label>
            <input id="assessor" name="assessor" type="text" defaultValue={ra.assessor ?? ""} className="field mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="assessmentDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Assessment date
            </label>
            <input
              id="assessmentDate"
              name="assessmentDate"
              type="date"
              defaultValue={ra.assessment_date}
              className="field mt-1"
            />
          </div>
          <div>
            <label htmlFor="reviewDueDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Review due date
            </label>
            <input
              id="reviewDueDate"
              name="reviewDueDate"
              type="date"
              defaultValue={ra.review_due_date ?? ""}
              className="field mt-1"
            />
          </div>
        </div>

        <button type="submit" className="btn-secondary">
          Save details
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold text-[var(--text-primary)]">
        Hazards <span className="font-normal text-muted">({hazards?.length ?? 0})</span>
      </h2>

      <ol className="mt-4 space-y-4">
        {(hazards ?? []).map((hazard, index) => {
          const boundUpdateHazard = updateHazard.bind(null, hazard.id);
          const boundDeleteHazard = deleteHazard.bind(null, hazard.id);
          const boundMoveUp = moveHazardUp.bind(null, hazard.id);
          const boundMoveDown = moveHazardDown.bind(null, hazard.id);
          const isFirst = index === 0;
          const isLast = index === (hazards?.length ?? 0) - 1;
          const initialLevel = riskLevelFromScore(hazard.initial_score);
          const residualLevel = riskLevelFromScore(hazard.residual_score);

          return (
            <li key={hazard.id} id={`hazard-${hazard.id}`} className="surface scroll-mt-6 p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Hazard {index + 1}</h3>
                <div className="flex items-center gap-1">
                  <form action={boundMoveUp}>
                    <button
                      type="submit"
                      disabled={isFirst}
                      aria-label={`Move hazard ${index + 1} up`}
                      className="rounded-md border px-2 py-1 text-sm text-muted hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ borderColor: "var(--border-strong)" }}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={boundMoveDown}>
                    <button
                      type="submit"
                      disabled={isLast}
                      aria-label={`Move hazard ${index + 1} down`}
                      className="rounded-md border px-2 py-1 text-sm text-muted hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ borderColor: "var(--border-strong)" }}
                    >
                      ↓
                    </button>
                  </form>
                  <form action={boundDeleteHazard}>
                    <ConfirmSubmitButton
                      confirmText={`Delete hazard ${index + 1}? This can't be undone.`}
                      ariaLabel={`Delete hazard ${index + 1}`}
                      className="rounded-md border px-2 py-1 text-sm hover:bg-[var(--danger-bg)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--danger)" }}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge label={`Initial: ${hazard.initial_score} — ${initialLevel.label}`} tone={initialLevel.tone} />
                <StatusBadge label={`Residual: ${hazard.residual_score} — ${residualLevel.label}`} tone={residualLevel.tone} />
              </div>

              <form action={boundUpdateHazard} className="mt-4 space-y-4">
                <div>
                  <label htmlFor={`hazard-description-${hazard.id}`} className="block text-sm font-medium text-[var(--text-primary)]">
                    Hazard description
                  </label>
                  <textarea
                    id={`hazard-description-${hazard.id}`}
                    name="hazardDescription"
                    rows={2}
                    required
                    defaultValue={hazard.hazard_description}
                    className="field mt-1"
                  />
                </div>

                <div>
                  <label htmlFor={`who-${hazard.id}`} className="block text-sm font-medium text-[var(--text-primary)]">
                    Who might be harmed
                  </label>
                  <textarea
                    id={`who-${hazard.id}`}
                    name="whoMightBeHarmed"
                    rows={2}
                    defaultValue={hazard.who_might_be_harmed ?? ""}
                    className="field mt-1"
                  />
                </div>

                <div>
                  <label htmlFor={`existing-controls-${hazard.id}`} className="block text-sm font-medium text-[var(--text-primary)]">
                    Existing controls
                  </label>
                  <textarea
                    id={`existing-controls-${hazard.id}`}
                    name="existingControls"
                    rows={2}
                    defaultValue={hazard.existing_controls ?? ""}
                    className="field mt-1"
                  />
                </div>

                <RiskMatrixPicker
                  label="Initial risk (before additional controls)"
                  likelihoodName="initialLikelihood"
                  severityName="initialSeverity"
                  defaultLikelihood={hazard.initial_likelihood}
                  defaultSeverity={hazard.initial_severity}
                />

                <div>
                  <label htmlFor={`additional-controls-${hazard.id}`} className="block text-sm font-medium text-[var(--text-primary)]">
                    Additional controls needed
                  </label>
                  <textarea
                    id={`additional-controls-${hazard.id}`}
                    name="additionalControls"
                    rows={2}
                    defaultValue={hazard.additional_controls ?? ""}
                    className="field mt-1"
                  />
                </div>

                <RiskMatrixPicker
                  label="Residual risk (after additional controls)"
                  likelihoodName="residualLikelihood"
                  severityName="residualSeverity"
                  defaultLikelihood={hazard.residual_likelihood}
                  defaultSeverity={hazard.residual_severity}
                />

                <button type="submit" className="btn-primary">
                  Save hazard
                </button>
              </form>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 rounded-lg border-2 border-dashed p-6" style={{ borderColor: "var(--border-strong)" }}>
        <h3 className="font-semibold text-[var(--text-primary)]">Add a hazard</h3>
        <HazardQuickAddForm action={boundAddHazard} />
      </div>

      {versions && versions.length > 0 && (
        <div className="surface mt-8 p-6">
          <h2 className="font-semibold text-[var(--text-primary)]">Revision history</h2>
          <p className="mt-1 text-xs text-faint">
            Snapshotted automatically each time an approved risk assessment is revised, so what was
            actually approved is never lost once editing resumes.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {versions.map((v) => (
              <li key={v.id}>
                Version {v.version_number} — approved wording as of {new Date(v.snapshotted_at).toLocaleDateString()}
                {v.snapshotted_by ? ` (revised by ${trailNameById.get(v.snapshotted_by) ?? "Someone"})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
