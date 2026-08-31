"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { addFinding } from "@/app/dashboard/internal-audits/actions";
import { FINDING_TYPES } from "@/lib/internal-audits";

export function FindingForm({ auditId }: { auditId: string }) {
  const boundAdd = addFinding.bind(null, auditId);

  return (
    <ToolModalTrigger triggerLabel="Add finding" title="Add Audit Finding">
      {(close) => (
        <form action={boundAdd} className="space-y-4">
          <div>
            <label htmlFor="findingType" className="block text-sm font-medium text-[var(--text-primary)]">
              Type
            </label>
            <select id="findingType" name="findingType" defaultValue="observation" className="field mt-1">
              {FINDING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="clauseReference" className="block text-sm font-medium text-[var(--text-primary)]">
              Clause / requirement reference <span className="text-faint">(optional)</span>
            </label>
            <input
              id="clauseReference"
              name="clauseReference"
              type="text"
              placeholder="e.g. 7.1.5 Monitoring and measuring resources"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)]">
              Description
            </label>
            <textarea id="description" name="description" required rows={3} className="field mt-1" />
          </div>

          <div>
            <label htmlFor="evidence" className="block text-sm font-medium text-[var(--text-primary)]">
              Evidence <span className="text-faint">(optional)</span>
            </label>
            <textarea id="evidence" name="evidence" rows={2} className="field mt-1" />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="correctiveActionRequired"
              name="correctiveActionRequired"
              type="checkbox"
              className="h-4 w-4 rounded"
              style={{ accentColor: "var(--brand)" }}
            />
            <label htmlFor="correctiveActionRequired" className="text-sm text-[var(--text-primary)]">
              Corrective action required
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={close} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add finding
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
