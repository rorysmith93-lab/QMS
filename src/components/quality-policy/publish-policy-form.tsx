"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { publishPolicy } from "@/app/dashboard/quality-policy/actions";

export function PublishPolicyForm({
  currentStatement,
  approvedBy,
}: {
  currentStatement: string;
  approvedBy: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ToolModalTrigger triggerLabel="Publish new version" title="Publish Quality Policy">
      {(close) => (
        <form action={publishPolicy} className="space-y-4">
          <p className="text-xs text-faint">
            This creates a new version — the current one stays on record, it isn&apos;t overwritten.
          </p>

          <div>
            <label htmlFor="statement" className="block text-sm font-medium text-[var(--text-primary)]">
              Policy statement
            </label>
            <textarea
              id="statement"
              name="statement"
              required
              rows={8}
              defaultValue={currentStatement}
              className="field mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="effectiveDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Effective date
              </label>
              <input
                id="effectiveDate"
                name="effectiveDate"
                type="date"
                defaultValue={today}
                className="field mt-1"
              />
            </div>
            <div>
              <label htmlFor="approvedBy" className="block text-sm font-medium text-[var(--text-primary)]">
                Approved by
              </label>
              <input
                id="approvedBy"
                name="approvedBy"
                type="text"
                defaultValue={approvedBy}
                className="field mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={close} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Publish
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
