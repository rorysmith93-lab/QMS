"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { createChangeRequest } from "@/app/dashboard/change-control/actions";
import { ChangeLinksPicker, type LinkableItem } from "@/components/change-control/change-links-picker";

type Member = { id: string; full_name: string | null; email: string };

export function ChangeRequestForm({
  members,
  documents,
  sops,
  workInstructions,
  ncrs,
}: {
  members: Member[];
  documents: LinkableItem[];
  sops: LinkableItem[];
  workInstructions: LinkableItem[];
  ncrs: LinkableItem[];
}) {
  return (
    <ToolModalTrigger triggerLabel="Raise change request" title="Raise a Change Request">
      {(close) => (
        <form action={createChangeRequest} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Update torque spec on the M6 bracket assembly"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)]">
              What&apos;s changing <span className="text-faint">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              placeholder="What's changing, and why"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="impactAssessment" className="block text-sm font-medium text-[var(--text-primary)]">
              Impact assessment <span className="text-faint">(optional)</span>
            </label>
            <textarea
              id="impactAssessment"
              name="impactAssessment"
              rows={2}
              placeholder="Who and what does this affect — training needed, resources, other processes"
              className="field mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-[var(--text-primary)]">
                Owner <span className="text-faint">(optional)</span>
              </label>
              <select id="owner" name="owner" defaultValue="" className="field mt-1">
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
                Target date <span className="text-faint">(optional)</span>
              </label>
              <input id="targetDate" name="targetDate" type="date" className="field mt-1" />
            </div>
          </div>

          <ChangeLinksPicker
            documents={documents}
            sops={sops}
            workInstructions={workInstructions}
            ncrs={ncrs}
            initialDocumentIds={[]}
            initialSopIds={[]}
            initialWorkInstructionIds={[]}
            initialNcrIds={[]}
          />

          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={close} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Raise
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
