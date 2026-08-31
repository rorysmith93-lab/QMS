"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { publishContextScope } from "@/app/dashboard/context/actions";

export function PublishContextScopeForm({
  currentExternalIssues,
  currentInternalIssues,
  currentScopeStatement,
  currentExclusions,
  approvedBy,
}: {
  currentExternalIssues: string;
  currentInternalIssues: string;
  currentScopeStatement: string;
  currentExclusions: string;
  approvedBy: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ToolModalTrigger triggerLabel="Publish new version" title="Publish Context & Scope">
      {(close) => (
        <form action={publishContextScope} className="space-y-4">
          <p className="text-xs text-faint">
            This creates a new version — the current one stays on record, it isn&apos;t overwritten.
          </p>

          <div>
            <label htmlFor="externalIssues" className="block text-sm font-medium text-[var(--text-primary)]">
              External issues <span className="text-faint">(clause 4.1)</span>
            </label>
            <p className="mt-0.5 text-xs text-faint">
              Market conditions, regulation, competitors, economic factors, technology.
            </p>
            <textarea
              id="externalIssues"
              name="externalIssues"
              rows={3}
              defaultValue={currentExternalIssues}
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="internalIssues" className="block text-sm font-medium text-[var(--text-primary)]">
              Internal issues <span className="text-faint">(clause 4.1)</span>
            </label>
            <p className="mt-0.5 text-xs text-faint">Staffing, equipment, culture, knowledge, capacity.</p>
            <textarea
              id="internalIssues"
              name="internalIssues"
              rows={3}
              defaultValue={currentInternalIssues}
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="scopeStatement" className="block text-sm font-medium text-[var(--text-primary)]">
              Scope of the QMS <span className="text-faint">(clause 4.3)</span>
            </label>
            <p className="mt-0.5 text-xs text-faint">
              What&apos;s covered — products/services, sites, departments — and the boundaries of the
              system.
            </p>
            <textarea
              id="scopeStatement"
              name="scopeStatement"
              required
              rows={4}
              defaultValue={currentScopeStatement}
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="exclusions" className="block text-sm font-medium text-[var(--text-primary)]">
              Exclusions <span className="text-faint">(optional)</span>
            </label>
            <p className="mt-0.5 text-xs text-faint">
              Any requirement that doesn&apos;t apply, and why — e.g. clause 8.3 Design and Development,
              if you only build to customer-supplied specifications.
            </p>
            <textarea
              id="exclusions"
              name="exclusions"
              rows={2}
              defaultValue={currentExclusions}
              className="field mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="effectiveDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Effective date
              </label>
              <input id="effectiveDate" name="effectiveDate" type="date" defaultValue={today} className="field mt-1" />
            </div>
            <div>
              <label htmlFor="approvedBy" className="block text-sm font-medium text-[var(--text-primary)]">
                Approved by
              </label>
              <input id="approvedBy" name="approvedBy" type="text" defaultValue={approvedBy} className="field mt-1" />
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
