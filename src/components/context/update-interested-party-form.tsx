"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { ConfirmSubmitButton } from "@/app/dashboard/work-instructions/confirm-submit-button";
import { deleteInterestedParty, updateInterestedParty } from "@/app/dashboard/context/actions";
import { PARTY_CATEGORIES } from "@/lib/context-and-scope";

type Party = {
  id: string;
  name: string;
  category: string;
  needs_expectations: string | null;
};

export function UpdateInterestedPartyForm({ party }: { party: Party }) {
  const boundUpdate = updateInterestedParty.bind(null, party.id);
  const boundDelete = deleteInterestedParty.bind(null, party.id);

  return (
    <ToolModalTrigger triggerLabel="Update" title="Update Interested Party">
      {(close) => (
        <form action={boundUpdate} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)]">
              Name
            </label>
            <input id="name" name="name" type="text" required defaultValue={party.name} className="field mt-1" />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-[var(--text-primary)]">
              Category
            </label>
            <select id="category" name="category" defaultValue={party.category} className="field mt-1">
              {PARTY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="needsExpectations" className="block text-sm font-medium text-[var(--text-primary)]">
              Needs &amp; expectations
            </label>
            <textarea
              id="needsExpectations"
              name="needsExpectations"
              rows={3}
              defaultValue={party.needs_expectations ?? ""}
              className="field mt-1"
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <ConfirmSubmitButton
              confirmText={`Remove "${party.name}" from interested parties? This can't be undone.`}
              formAction={boundDelete}
              className="text-xs text-faint hover:text-[var(--danger)]"
            >
              Remove
            </ConfirmSubmitButton>
            <div className="flex gap-2">
              <button type="button" onClick={close} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
