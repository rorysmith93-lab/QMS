"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { createInterestedParty } from "@/app/dashboard/context/actions";
import { PARTY_CATEGORIES } from "@/lib/context-and-scope";

export function InterestedPartyForm() {
  return (
    <ToolModalTrigger triggerLabel="Add interested party" title="Add Interested Party">
      {(close) => (
        <form action={createInterestedParty} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)]">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Key customers, HSE inspectorate, ISO certification body"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-[var(--text-primary)]">
              Category
            </label>
            <select id="category" name="category" defaultValue="other" className="field mt-1">
              {PARTY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="needsExpectations" className="block text-sm font-medium text-[var(--text-primary)]">
              Needs &amp; expectations <span className="text-faint">(optional)</span>
            </label>
            <textarea id="needsExpectations" name="needsExpectations" rows={3} className="field mt-1" />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={close} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
