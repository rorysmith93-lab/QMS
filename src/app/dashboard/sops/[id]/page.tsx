import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import {
  addStep,
  approveSop,
  archiveSop,
  checkSop,
  deleteStep,
  moveStepDown,
  moveStepUp,
  returnSopToDraft,
  reviseSop,
  updateSopMeta,
  updateStep,
} from "@/app/dashboard/sops/actions";
import { ConfirmSubmitButton } from "@/app/dashboard/work-instructions/confirm-submit-button";
import { statusLabel, statusTone } from "@/lib/documents";
import { canActOnCategory, getWorkflowMode } from "@/lib/document-authorization";
import { StatusBadge } from "@/components/status-badge";

type SopRow = {
  id: string;
  title: string;
  document_number: string | null;
  purpose: string | null;
  scope: string | null;
  responsibilities: string | null;
  reference_notes: string | null;
  status: string;
  checked_by: string | null;
  checked_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
};

type StepRow = {
  id: string;
  position: number;
  description: string;
  linked_work_instruction_id: string | null;
};

type VersionRow = {
  id: string;
  version_number: number;
  snapshotted_by: string | null;
  snapshotted_at: string;
};

export default async function SopBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const { data: sop } = await supabase
    .from("sops")
    .select(
      "id, title, document_number, purpose, scope, responsibilities, reference_notes, status, checked_by, checked_at, approved_by, approved_at"
    )
    .eq("id", id)
    .single<SopRow>();

  if (!sop) {
    notFound();
  }

  const [workflowMode, canCheck, canApprove, canAuthor] = await Promise.all([
    getWorkflowMode(supabase, profile.company_id, "procedure"),
    canActOnCategory(supabase, profile.company_id, "procedure", profile.id, "checker"),
    canActOnCategory(supabase, profile.company_id, "procedure", profile.id, "approver"),
    canActOnCategory(supabase, profile.company_id, "procedure", profile.id, "author"),
  ]);

  const [{ data: steps }, { data: workInstructions }, { data: versions }] = await Promise.all([
    supabase
      .from("sop_steps")
      .select("id, position, description, linked_work_instruction_id")
      .eq("sop_id", id)
      .order("position", { ascending: true })
      .returns<StepRow[]>(),
    supabase
      .from("work_instructions")
      .select("id, title, document_number")
      .order("title", { ascending: true })
      .returns<{ id: string; title: string; document_number: string | null }[]>(),
    supabase
      .from("sop_versions")
      .select("id, version_number, snapshotted_by, snapshotted_at")
      .eq("sop_id", id)
      .order("version_number", { ascending: false })
      .returns<VersionRow[]>(),
  ]);

  const wiById = new Map((workInstructions ?? []).map((wi) => [wi.id, wi]));

  // Names for the checked/approved trail plus every version's "revised
  // by", all fetched in one go.
  const trailProfileIds = Array.from(
    new Set(
      [sop.checked_by, sop.approved_by, ...(versions ?? []).map((v) => v.snapshotted_by)].filter(
        (v): v is string => Boolean(v)
      )
    )
  );
  const { data: trailProfiles } = trailProfileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", trailProfileIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const trailNameById = new Map((trailProfiles ?? []).map((p) => [p.id, p.full_name || "Someone"]));

  const boundUpdateMeta = updateSopMeta.bind(null, sop.id);
  const boundAddStep = addStep.bind(null, sop.id);
  const boundCheck = checkSop.bind(null, sop.id);
  const boundApprove = approveSop.bind(null, sop.id);
  const boundArchive = archiveSop.bind(null, sop.id);
  const boundReturnToDraft = returnSopToDraft.bind(null, sop.id);
  const boundRevise = reviseSop.bind(null, sop.id);

  const showCheckButton = workflowMode === "check_and_approve" && sop.status === "draft" && canCheck;
  const showApproveButton =
    canApprove && (workflowMode === "check_and_approve" ? sop.status === "checked" : sop.status === "draft");
  const showArchiveButton = canApprove && sop.status === "approved";
  // Deliberately checked-only, same reasoning as Documents — once
  // Approved, "Revise" is the only way back to Draft, so the previously
  // approved wording gets snapshotted first rather than silently reopened.
  const showReturnToDraftButton = sop.status === "checked";
  const showReviseButton = sop.status === "approved" && canAuthor;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/sops" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to SOPs
      </Link>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{sop.title}</h1>
          <div className="mt-2">
            <StatusBadge label={statusLabel(sop.status)} tone={statusTone(sop.status)} />
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
        {sop.checked_by && sop.checked_at && (
          <span className="text-xs text-faint">
            Checked by {trailNameById.get(sop.checked_by)} on {new Date(sop.checked_at).toLocaleDateString()}
          </span>
        )}
        {sop.approved_by && sop.approved_at && (
          <span className="text-xs text-faint">
            Approved by {trailNameById.get(sop.approved_by)} on{" "}
            {new Date(sop.approved_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {!showCheckButton && !showApproveButton && sop.status !== "approved" && sop.status !== "archived" && (
        <p className="mt-1 text-xs text-faint">
          {workflowMode === "check_and_approve" && sop.status === "draft" && !canCheck
            ? "Waiting on someone authorized to check this category — see Authorization."
            : workflowMode !== "check_and_approve" && sop.status === "draft" && !canApprove
              ? "Waiting on someone authorized to approve this category — see Authorization."
              : null}
        </p>
      )}

      <form action={boundUpdateMeta} className="surface mt-4 space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
              Title
            </label>
            <input id="title" name="title" type="text" required defaultValue={sop.title} className="field mt-1" />
          </div>
          <div>
            <label htmlFor="documentNumber" className="block text-sm font-medium text-[var(--text-primary)]">
              Document number
            </label>
            <input
              id="documentNumber"
              name="documentNumber"
              type="text"
              defaultValue={sop.document_number ?? ""}
              className="field mt-1"
            />
          </div>
        </div>

        <div>
          <label htmlFor="purpose" className="block text-sm font-medium text-[var(--text-primary)]">
            Purpose
          </label>
          <textarea
            id="purpose"
            name="purpose"
            rows={2}
            placeholder="Why this procedure exists."
            defaultValue={sop.purpose ?? ""}
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="scope" className="block text-sm font-medium text-[var(--text-primary)]">
            Scope
          </label>
          <textarea
            id="scope"
            name="scope"
            rows={2}
            placeholder="What this procedure covers, and what it doesn't."
            defaultValue={sop.scope ?? ""}
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="responsibilities" className="block text-sm font-medium text-[var(--text-primary)]">
            Responsibilities
          </label>
          <textarea
            id="responsibilities"
            name="responsibilities"
            rows={2}
            placeholder="Who does what."
            defaultValue={sop.responsibilities ?? ""}
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="referenceNotes" className="block text-sm font-medium text-[var(--text-primary)]">
            References <span className="text-faint">(optional)</span>
          </label>
          <textarea
            id="referenceNotes"
            name="referenceNotes"
            rows={2}
            placeholder="Related documents, standards, or forms."
            defaultValue={sop.reference_notes ?? ""}
            className="field mt-1"
          />
        </div>

        <button type="submit" className="btn-secondary">
          Save details
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold text-[var(--text-primary)]">
        Procedure <span className="font-normal text-muted">({steps?.length ?? 0} steps)</span>
      </h2>

      <ol className="mt-4 space-y-4">
        {(steps ?? []).map((step, index) => {
          const boundUpdateStep = updateStep.bind(null, step.id);
          const boundDeleteStep = deleteStep.bind(null, step.id);
          const boundMoveUp = moveStepUp.bind(null, step.id);
          const boundMoveDown = moveStepDown.bind(null, step.id);
          const isFirst = index === 0;
          const isLast = index === (steps?.length ?? 0) - 1;
          const linkedWi = step.linked_work_instruction_id ? wiById.get(step.linked_work_instruction_id) : null;

          return (
            <li key={step.id} id={`step-${step.id}`} className="surface scroll-mt-6 p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold text-[var(--text-primary)]">Step {index + 1}</h3>
                <div className="flex items-center gap-1">
                  <form action={boundMoveUp}>
                    <button
                      type="submit"
                      disabled={isFirst}
                      aria-label={`Move step ${index + 1} up`}
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
                      aria-label={`Move step ${index + 1} down`}
                      className="rounded-md border px-2 py-1 text-sm text-muted hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ borderColor: "var(--border-strong)" }}
                    >
                      ↓
                    </button>
                  </form>
                  <form action={boundDeleteStep}>
                    <ConfirmSubmitButton
                      confirmText={`Delete step ${index + 1}? This can't be undone.`}
                      ariaLabel={`Delete step ${index + 1}`}
                      className="rounded-md border px-2 py-1 text-sm hover:bg-[var(--danger-bg)]"
                      style={{ borderColor: "var(--border-strong)", color: "var(--danger)" }}
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>

              <form action={boundUpdateStep} className="mt-4 space-y-4">
                <div>
                  <label htmlFor={`description-${step.id}`} className="block text-sm font-medium text-[var(--text-primary)]">
                    Description
                  </label>
                  <textarea
                    id={`description-${step.id}`}
                    name="description"
                    rows={3}
                    required
                    defaultValue={step.description}
                    className="field mt-1"
                  />
                </div>

                <div>
                  <label htmlFor={`wi-${step.id}`} className="block text-sm font-medium text-[var(--text-primary)]">
                    Linked work instruction <span className="text-faint">(optional)</span>
                  </label>
                  <select
                    id={`wi-${step.id}`}
                    name="linkedWorkInstructionId"
                    defaultValue={step.linked_work_instruction_id ?? ""}
                    className="field mt-1"
                  >
                    <option value="">— None —</option>
                    {(workInstructions ?? []).map((wi) => (
                      <option key={wi.id} value={wi.id}>
                        {wi.document_number ? `${wi.document_number} — ${wi.title}` : wi.title}
                      </option>
                    ))}
                  </select>
                  {linkedWi && (
                    <Link
                      href={`/dashboard/work-instructions/${linkedWi.id}`}
                      className="link-brand mt-1 inline-block text-xs"
                    >
                      Open {linkedWi.document_number ? `${linkedWi.document_number} — ${linkedWi.title}` : linkedWi.title}
                    </Link>
                  )}
                </div>

                <button type="submit" className="btn-primary">
                  Save step
                </button>
              </form>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 rounded-lg border-2 border-dashed p-6" style={{ borderColor: "var(--border-strong)" }}>
        <h3 className="font-semibold text-[var(--text-primary)]">Add a step</h3>
        <form action={boundAddStep} className="mt-4 space-y-4">
          <div>
            <label htmlFor="new-description" className="block text-sm font-medium text-[var(--text-primary)]">
              Description
            </label>
            <textarea id="new-description" name="description" rows={3} required className="field mt-1" />
          </div>

          <div>
            <label htmlFor="new-wi" className="block text-sm font-medium text-[var(--text-primary)]">
              Linked work instruction <span className="text-faint">(optional)</span>
            </label>
            <select id="new-wi" name="linkedWorkInstructionId" defaultValue="" className="field mt-1">
              <option value="">— None —</option>
              {(workInstructions ?? []).map((wi) => (
                <option key={wi.id} value={wi.id}>
                  {wi.document_number ? `${wi.document_number} — ${wi.title}` : wi.title}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary">
            Add step
          </button>
        </form>
      </div>

      {versions && versions.length > 0 && (
        <div className="surface mt-8 p-6">
          <h2 className="font-semibold text-[var(--text-primary)]">Revision history</h2>
          <p className="mt-1 text-xs text-faint">
            Snapshotted automatically each time an approved SOP is revised, so what was actually
            approved is never lost once editing resumes.
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
