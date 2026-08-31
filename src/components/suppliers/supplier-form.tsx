"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { createSupplier } from "@/app/dashboard/suppliers/actions";
import { APPROVAL_STATUSES } from "@/lib/suppliers";

export function SupplierForm() {
  return (
    <ToolModalTrigger triggerLabel="Add supplier" title="Add Supplier">
      {(close) => (
        <form action={createSupplier} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)]">
              Supplier name
            </label>
            <input id="name" name="name" type="text" required className="field mt-1" />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-[var(--text-primary)]">
              What they supply <span className="text-faint">(optional)</span>
            </label>
            <input
              id="category"
              name="category"
              type="text"
              placeholder="e.g. Raw material — steel bar stock"
              className="field mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-[var(--text-primary)]">
                Contact name
              </label>
              <input id="contactName" name="contactName" type="text" className="field mt-1" />
            </div>
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-[var(--text-primary)]">
                Contact email
              </label>
              <input id="contactEmail" name="contactEmail" type="email" className="field mt-1" />
            </div>
            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-[var(--text-primary)]">
                Contact phone
              </label>
              <input id="contactPhone" name="contactPhone" type="text" className="field mt-1" />
            </div>
          </div>

          <div>
            <label htmlFor="approvalStatus" className="block text-sm font-medium text-[var(--text-primary)]">
              Approval status
            </label>
            <select id="approvalStatus" name="approvalStatus" defaultValue="under_review" className="field mt-1">
              {APPROVAL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lastEvaluatedDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Last evaluated <span className="text-faint">(optional)</span>
              </label>
              <input id="lastEvaluatedDate" name="lastEvaluatedDate" type="date" className="field mt-1" />
            </div>
            <div>
              <label htmlFor="nextEvaluationDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Next evaluation due <span className="text-faint">(optional)</span>
              </label>
              <input id="nextEvaluationDate" name="nextEvaluationDate" type="date" className="field mt-1" />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-primary)]">
              Notes <span className="text-faint">(optional)</span>
            </label>
            <textarea id="notes" name="notes" rows={2} className="field mt-1" />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={close} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add supplier
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
