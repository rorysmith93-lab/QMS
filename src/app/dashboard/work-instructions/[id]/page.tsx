import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import {
  addStep,
  archiveWorkInstruction,
  checkWorkInstruction,
  deleteStep,
  moveStepDown,
  moveStepUp,
  publishWorkInstruction,
  returnWorkInstructionToDraft,
  reviseWorkInstruction,
  updateRequirements,
  updateStep,
  updateWorkInstructionMeta,
} from "@/app/dashboard/work-instructions/actions";
import { ConfirmSubmitButton } from "@/app/dashboard/work-instructions/confirm-submit-button";
import { statusLabel, statusTone } from "@/lib/documents";
import { canActOnCategory, getWorkflowMode } from "@/lib/document-authorization";
import { StatusBadge } from "@/components/status-badge";
import { PhotoField } from "@/components/photo-field";
import { RequirementsPicker } from "@/components/requirements-picker";
import { FONT_OPTIONS, fontOption } from "@/lib/work-instruction-font";

const IMAGE_BUCKET = "work-instruction-images";
const EQUIPMENT_BUCKET = "equipment-images";

type WorkInstructionRow = {
  id: string;
  title: string;
  document_number: string | null;
  status: string;
  current_published_version_id: string | null;
  ppe_items: string[];
  font: string;
  checked_by: string | null;
  checked_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
};

type StepRow = {
  id: string;
  position: number;
  title: string | null;
  body: string | null;
  caution: string | null;
  image_path: string | null;
};

export default async function WorkInstructionBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const companyLogoUrl = profile.companies?.logo_path
    ? supabase.storage.from("logos").getPublicUrl(profile.companies.logo_path).data.publicUrl
    : null;

  const { data: wi } = await supabase
    .from("work_instructions")
    .select(
      "id, title, document_number, status, current_published_version_id, ppe_items, font, checked_by, checked_at, approved_by, approved_at"
    )
    .eq("id", id)
    .single<WorkInstructionRow>();

  if (!wi) {
    notFound();
  }

  const [workflowMode, canCheck, canApprove, canAuthor] = await Promise.all([
    getWorkflowMode(supabase, profile.company_id, "work_instruction"),
    canActOnCategory(supabase, profile.company_id, "work_instruction", profile.id, "checker"),
    canActOnCategory(supabase, profile.company_id, "work_instruction", profile.id, "approver"),
    canActOnCategory(supabase, profile.company_id, "work_instruction", profile.id, "author"),
  ]);

  // Names for the checked/approved trail, shown next to the status badge.
  const trailProfileIds = [wi.checked_by, wi.approved_by].filter((v): v is string => Boolean(v));
  const { data: trailProfiles } = trailProfileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", trailProfileIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const trailNameById = new Map((trailProfiles ?? []).map((p) => [p.id, p.full_name || "Someone"]));

  const { data: steps } = await supabase
    .from("work_instruction_steps")
    .select("id, position, title, body, caution, image_path")
    .eq("work_instruction_id", id)
    .order("position", { ascending: true })
    .returns<StepRow[]>();

  const stepsWithImages = await Promise.all(
    (steps ?? []).map(async (step) => {
      if (!step.image_path) return { ...step, imageUrl: null };
      const { data: signed } = await supabase.storage
        .from(IMAGE_BUCKET)
        .createSignedUrl(step.image_path, 60 * 5);
      return { ...step, imageUrl: signed?.signedUrl ?? null };
    })
  );

  const [{ data: equipmentLibrary }, { data: selectedEquipmentRows }] = await Promise.all([
    supabase
      .from("equipment_items")
      .select("id, name, image_path")
      .order("name")
      .returns<{ id: string; name: string; image_path: string | null }[]>(),
    supabase.from("work_instruction_equipment").select("equipment_item_id").eq("work_instruction_id", id),
  ]);

  const selectedEquipmentIds = new Set((selectedEquipmentRows ?? []).map((r) => r.equipment_item_id));

  const equipmentLibraryWithUrls = await Promise.all(
    (equipmentLibrary ?? []).map(async (item) => {
      if (!item.image_path) return { ...item, imageUrl: null };
      const { data: signed } = await supabase.storage
        .from(EQUIPMENT_BUCKET)
        .createSignedUrl(item.image_path, 60 * 5);
      return { ...item, imageUrl: signed?.signedUrl ?? null };
    })
  );

  const boundUpdateMeta = updateWorkInstructionMeta.bind(null, wi.id);
  const boundUpdateRequirements = updateRequirements.bind(null, wi.id);
  const boundAddStep = addStep.bind(null, wi.id);
  const boundPublish = publishWorkInstruction.bind(null, wi.id);
  const boundCheck = checkWorkInstruction.bind(null, wi.id);
  const boundReturnToDraft = returnWorkInstructionToDraft.bind(null, wi.id);
  const boundRevise = reviseWorkInstruction.bind(null, wi.id);
  const boundArchive = archiveWorkInstruction.bind(null, wi.id);

  const showCheckButton = workflowMode === "check_and_approve" && wi.status === "draft" && canCheck;
  const showPublishButton =
    canApprove && (workflowMode === "check_and_approve" ? wi.status === "checked" : wi.status === "draft");
  const showArchiveButton = canApprove && wi.status === "approved";
  const showReturnToDraftButton = wi.status === "checked";
  const showReviseButton = wi.status === "approved" && canAuthor;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/work-instructions"
        className="text-sm text-muted hover:text-[var(--text-primary)]"
      >
        ← Back to work instructions
      </Link>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {companyLogoUrl && (
            // Fixed height, free width (capped) rather than a square box —
            // a landscape logo squeezed into a square renders tiny.
            <Image
              src={companyLogoUrl}
              alt={`${profile.companies?.name ?? "Company"} logo`}
              width={200}
              height={48}
              unoptimized
              className="h-12 w-auto max-w-[200px] shrink-0 object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{wi.title}</h1>
            <div className="mt-2">
              <StatusBadge label={statusLabel(wi.status)} tone={statusTone(wi.status)} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {wi.current_published_version_id && (
            <Link href={`/dashboard/work-instructions/${wi.id}/view`} className="btn-secondary">
              View published
            </Link>
          )}
          <a href={`/dashboard/work-instructions/${wi.id}/pdf`} className="btn-secondary">
            Export draft to PDF
          </a>
          {showCheckButton && (
            <form action={boundCheck}>
              <button type="submit" className="btn-secondary">
                Mark as checked
              </button>
            </form>
          )}
          {showPublishButton && (
            <form action={boundPublish}>
              <button type="submit" className="btn-primary">
                Publish
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
        <p className="text-xs text-faint">
          Publishing locks in the current steps as a numbered version people can view and export —
          you can keep editing the draft afterwards without affecting what&apos;s published.
        </p>
        {wi.checked_by && wi.checked_at && (
          <span className="text-xs text-faint">
            Checked by {trailNameById.get(wi.checked_by)} on {new Date(wi.checked_at).toLocaleDateString()}
          </span>
        )}
        {wi.approved_by && wi.approved_at && (
          <span className="text-xs text-faint">
            Approved by {trailNameById.get(wi.approved_by)} on {new Date(wi.approved_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {!showCheckButton && !showPublishButton && wi.status !== "approved" && wi.status !== "archived" && (
        <p className="mt-1 text-xs text-faint">
          {workflowMode === "check_and_approve" && wi.status === "draft" && !canCheck
            ? "Waiting on someone authorized to check this category — see Authorization."
            : workflowMode !== "check_and_approve" && wi.status === "draft" && !canApprove
              ? "Waiting on someone authorized to publish/approve this category — see Authorization."
              : null}
        </p>
      )}

      <form
        action={boundUpdateMeta}
        className="surface mt-4 grid grid-cols-1 gap-4 p-6 sm:grid-cols-4"
      >
        <div className="sm:col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input id="title" name="title" type="text" required defaultValue={wi.title} className="field mt-1" />
        </div>
        <div>
          <label htmlFor="documentNumber" className="block text-sm font-medium text-[var(--text-primary)]">
            Document number
          </label>
          <input
            id="documentNumber"
            name="documentNumber"
            type="text"
            defaultValue={wi.document_number ?? ""}
            className="field mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="font" className="block text-sm font-medium text-[var(--text-primary)]">
            Font
          </label>
          <select id="font" name="font" defaultValue={wi.font} className="field mt-1">
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-faint">
            Applies to the published view and PDF export — company logo comes from Settings.
          </p>
        </div>
        <div className="flex items-end sm:col-span-2">
          <button type="submit" className="btn-secondary">
            Save details
          </button>
        </div>
      </form>

      <form action={boundUpdateRequirements} className="surface mt-6 space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Required PPE &amp; Equipment</h2>
            <p className="mt-1 text-xs text-faint">
              Shown at the top of the published instruction, before the steps.
            </p>
          </div>
          <Link href="/dashboard/equipment" className="link-brand text-sm whitespace-nowrap">
            Manage equipment library
          </Link>
        </div>

        <RequirementsPicker
          initialPpe={wi.ppe_items}
          equipmentLibrary={equipmentLibraryWithUrls}
          initialEquipmentIds={[...selectedEquipmentIds]}
        />

        <button type="submit" className="btn-secondary">
          Save requirements
        </button>
      </form>

      {/* The chosen font previews live here too, not just in the
          published output — Tailwind's reset makes form fields inherit
          font-family, so this covers the step text inputs as well. */}
      <div style={{ fontFamily: fontOption(wi.font).css }}>
        <h2 className="mt-10 text-lg font-semibold text-[var(--text-primary)]">
          Steps <span className="font-normal text-muted">({stepsWithImages.length})</span>
        </h2>

        <ol className="mt-4 space-y-6">
        {stepsWithImages.map((step, index) => {
          const boundUpdateStep = updateStep.bind(null, step.id);
          const boundDeleteStep = deleteStep.bind(null, step.id);
          const boundMoveUp = moveStepUp.bind(null, step.id);
          const boundMoveDown = moveStepDown.bind(null, step.id);
          const isFirst = index === 0;
          const isLast = index === stepsWithImages.length - 1;

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
                  <label
                    htmlFor={`title-${step.id}`}
                    className="block text-sm font-medium text-[var(--text-primary)]"
                  >
                    Step title <span className="text-faint">(optional)</span>
                  </label>
                  <input
                    id={`title-${step.id}`}
                    name="title"
                    type="text"
                    defaultValue={step.title ?? ""}
                    placeholder="e.g. Attach bracket to frame"
                    className="field mt-1"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`body-${step.id}`}
                    className="block text-sm font-medium text-[var(--text-primary)]"
                  >
                    Instructions
                  </label>
                  <textarea
                    id={`body-${step.id}`}
                    name="body"
                    rows={3}
                    defaultValue={step.body ?? ""}
                    className="field mt-1"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`caution-${step.id}`}
                    className="block text-sm font-medium text-[var(--text-primary)]"
                  >
                    Caution <span className="text-faint">(optional)</span>
                  </label>
                  <textarea
                    id={`caution-${step.id}`}
                    name="caution"
                    rows={2}
                    defaultValue={step.caution ?? ""}
                    placeholder="e.g. Wear safety glasses before this step"
                    className="field mt-1"
                  />
                  {step.caution && (
                    <p className="banner-caution mt-2">
                      <strong>Caution:</strong> {step.caution}
                    </p>
                  )}
                </div>

                {step.imageUrl && (
                  <div>
                    <Image
                      src={step.imageUrl}
                      alt={`Photo for step ${index + 1}${step.title ? `: ${step.title}` : ""}`}
                      width={480}
                      height={320}
                      unoptimized
                      className="max-h-64 w-auto rounded-md border object-contain"
                      style={{ borderColor: "var(--border)" }}
                    />
                    <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                      <input type="checkbox" name="removeImage" className="rounded" style={{ borderColor: "var(--border-strong)" }} />
                      Remove this photo
                    </label>
                  </div>
                )}

                <PhotoField
                  name="image"
                  label={`${step.imageUrl ? "Replace photo" : "Add a photo"} (optional)`}
                />

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
            <label htmlFor="new-title" className="block text-sm font-medium text-[var(--text-primary)]">
              Step title <span className="text-faint">(optional)</span>
            </label>
            <input
              id="new-title"
              name="title"
              type="text"
              placeholder="e.g. Attach bracket to frame"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="new-body" className="block text-sm font-medium text-[var(--text-primary)]">
              Instructions
            </label>
            <textarea id="new-body" name="body" rows={3} className="field mt-1" />
          </div>

          <div>
            <label htmlFor="new-caution" className="block text-sm font-medium text-[var(--text-primary)]">
              Caution <span className="text-faint">(optional)</span>
            </label>
            <textarea
              id="new-caution"
              name="caution"
              rows={2}
              placeholder="e.g. Wear safety glasses before this step"
              className="field mt-1"
            />
          </div>

          <PhotoField name="image" label="Photo (optional)" />

          <button type="submit" className="btn-primary">
            Add step
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
