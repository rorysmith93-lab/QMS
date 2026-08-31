"use client";

import { useRef } from "react";
import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { logMaintenance } from "@/app/dashboard/equipment/infrastructure/actions";

// Adds `months` calendar months to a yyyy-mm-dd string, for the quick-fill
// next-due buttons — same helper as the calibration log's.
function addMonths(dateStr: string, months: number) {
  const base = dateStr ? new Date(dateStr) : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

export function MaintenanceForm({ assetId }: { assetId: string }) {
  const boundLog = logMaintenance.bind(null, assetId);
  const today = new Date().toISOString().slice(0, 10);
  const performedDateRef = useRef<HTMLInputElement>(null);
  const nextDueDateRef = useRef<HTMLInputElement>(null);

  function fillNextDue(months: number) {
    if (!nextDueDateRef.current) return;
    nextDueDateRef.current.value = addMonths(performedDateRef.current?.value || today, months);
  }

  return (
    <ToolModalTrigger triggerLabel="Log maintenance" title="Log Maintenance">
      {(close) => (
        <form action={boundLog} className="space-y-4">
          <div>
            <label htmlFor="performedDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Date performed
            </label>
            <input
              id="performedDate"
              name="performedDate"
              type="date"
              defaultValue={today}
              ref={performedDateRef}
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="nextDueDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Next due date <span className="text-faint">(optional)</span>
            </label>
            <input id="nextDueDate" name="nextDueDate" type="date" ref={nextDueDateRef} className="field mt-1" />
            <div className="mt-1.5 flex gap-1.5">
              <button type="button" onClick={() => fillNextDue(3)} className="btn-secondary text-xs">
                +3 months
              </button>
              <button type="button" onClick={() => fillNextDue(6)} className="btn-secondary text-xs">
                +6 months
              </button>
              <button type="button" onClick={() => fillNextDue(12)} className="btn-secondary text-xs">
                +1 year
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="performedBy" className="block text-sm font-medium text-[var(--text-primary)]">
              Performed by <span className="text-faint">(optional)</span>
            </label>
            <input
              id="performedBy"
              name="performedBy"
              type="text"
              placeholder="e.g. Internal, or the contractor's name"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="certificate" className="block text-sm font-medium text-[var(--text-primary)]">
              Service report / invoice <span className="text-faint">(optional)</span>
            </label>
            <input
              id="certificate"
              name="certificate"
              type="file"
              accept="application/pdf,image/*"
              className="field mt-1"
            />
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
              Log maintenance
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
