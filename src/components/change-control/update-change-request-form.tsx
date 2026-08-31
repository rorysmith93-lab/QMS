"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { updateChangeRequest } from "@/app/dashboard/change-control/actions";
import { CHANGE_STATUSES } from "@/lib/change-control";
import { ChangeLinksPicker, type LinkableItem } from "@/components/change-control/change-links-picker";

type Member = { id: string; full_name: string | null; email: string };

type ChangeRequest = {
  id: string;
  title: string;
  description: string | null;
  impact_assessment: string | null;
  owner: string | null;
  target_date: string | null;
  status: string;
};

export function UpdateChangeRequestForm({
  changeRequest,
  members,
  documents,
  sops,
  workInstructions,
  ncrs,
  linkedDocumentIds,
  linkedSopIds,
  linkedWorkInstructionIds,
  linkedNcrIds,
}: {
  changeRequest: ChangeRequest;
  members: Member[];
  documents: LinkableItem[];
  sops: LinkableItem[];
  workInstructions: LinkableItem[];
  ncrs: LinkableItem[];
  linkedDocumentIds: string[];
  linkedSopIds: string[];
  linkedWorkInstructionIds: string[];
  linkedNcrIds: string[];
}) {
  const boundUpdate = updateChangeRequest.bind(null, changeRequest.id);

  return (
    <ToolModalTrigger triggerLabel="Update" title="Update Change Request">
      {(close) => (
        <form action={boundUpdate} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={changeRequest.title}
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)]">
              What&apos;s changing
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={changeRequest.description ?? ""}
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="impactAssessment" className="block text-sm font-medium text-[var(--text-primary)]">
              Impact assessment
            </label>
            <textarea
              id="impactAssessment"
              name="impactAssessment"
              rows={2}
              defaultValue={changeRequest.impact_assessment ?? ""}
              className="field mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-[var(--text-primary)]">
                Owner
              </label>
              <select id="owner" name="owner" defaultValue={changeRequest.owner ?? ""} className="field mt-1">
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="targetDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Target date
              </label>
              <input
                id="targetDate"
                name="targetDate"
                type="date"
                defaultValue={changeRequest.target_date ?? ""}
                className="field mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)]">
              Status
            </label>
            <select id="status" name="status" defaultValue={changeRequest.status} className="field mt-1">
              {CHANGE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-faint">
              Moving to Approved or Implemented records who did it and when, the first time — it won&apos;t change on later edits.
            </p>
          </div>

          <ChangeLinksPicker
            documents={documents}
            sops={sops}
            workInstructions={workInstructions}
            ncrs={ncrs}
            initialDocumentIds={linkedDocumentIds}
            initialSopIds={linkedSopIds}
            initialWorkInstructionIds={linkedWorkInstructionIds}
            initialNcrIds={linkedNcrIds}
          />

          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={close} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
