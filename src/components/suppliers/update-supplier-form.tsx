"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { updateSupplier } from "@/app/dashboard/suppliers/actions";
import { APPROVAL_STATUSES } from "@/lib/suppliers";

type Supplier = {
  id: string;
  name: string;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  approval_status: string;
  last_evaluated_date: string | null;
  next_evaluation_date: string | null;
  notes: string | null;
};

export function UpdateSupplierForm({ supplier }: { supplier: Supplier }) {
  const boundUpdate = updateSupplier.bind(null, supplier.id);

  return (
    <ToolModalTrigger triggerLabel="Update" title="Update Supplier">
      {(close) => (
        <form action={boundUpdate} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)]">
              Supplier name
            </label>
            <input id="name" name="name" type="text" required defaultValue={supplier.name} className="field mt-1" />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-[var(--text-primary)]">
              What they supply
            </label>
            <input
              id="category"
              name="category"
              type="text"
              defaultValue={supplier.category ?? ""}
              className="field mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-[var(--text-primary)]">
                Contact name
              </label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                defaultValue={supplier.contact_name ?? ""}
                className="field mt-1"
              />
            </div>
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-[var(--text-primary)]">
                Contact email
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={supplier.contact_email ?? ""}
                className="field mt-1"
              />
            </div>
            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-[var(--text-primary)]">
                Contact phone
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="text"
                defaultValue={supplier.contact_phone ?? ""}
                className="field mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="approvalStatus" className="block text-sm font-medium text-[var(--text-primary)]">
              Approval status
            </label>
            <select
              id="approvalStatus"
              name="approvalStatus"
              defaultValue={supplier.approval_status}
              className="field mt-1"
            >
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
                Last evaluated
              </label>
              <input
                id="lastEvaluatedDate"
                name="lastEvaluatedDate"
                type="date"
                defaultValue={supplier.last_evaluated_date ?? ""}
                className="field mt-1"
              />
            </div>
            <div>
              <label htmlFor="nextEvaluationDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Next evaluation due
              </label>
              <input
                id="nextEvaluationDate"
                name="nextEvaluationDate"
                type="date"
                defaultValue={supplier.next_evaluation_date ?? ""}
                className="field mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-primary)]">
              Notes
            </label>
            <textarea id="notes" name="notes" rows={2} defaultValue={supplier.notes ?? ""} className="field mt-1" />
          </div>

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
