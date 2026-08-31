"use client";

import { useRef } from "react";
import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { logCalibration } from "@/app/dashboard/equipment/actions";
import { CALIBRATION_RESULTS } from "@/lib/calibration";

// Adds `months` calendar months to a yyyy-mm-dd string, for the quick-fill
// next-due buttons — same helper as the training log's expiry buttons.
function addMonths(dateStr: string, months: number) {
  const base = dateStr ? new Date(dateStr) : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

export function CalibrationForm({ equipmentId }: { equipmentId: string }) {
  const boundLog = logCalibration.bind(null, equipmentId);
  const today = new Date().toISOString().slice(0, 10);
  const calibratedDateRef = useRef<HTMLInputElement>(null);
  const nextDueDateRef = useRef<HTMLInputElement>(null);

  function fillNextDue(months: number) {
    if (!nextDueDateRef.current) return;
    nextDueDateRef.current.value = addMonths(calibratedDateRef.current?.value || today, months);
  }

  return (
    <ToolModalTrigger triggerLabel="Log calibration" title="Log Calibration">
      {(close) => (
        <form action={boundLog} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="calibratedDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Calibrated date
              </label>
              <input
                id="calibratedDate"
                name="calibratedDate"
                type="date"
                defaultValue={today}
                ref={calibratedDateRef}
                className="field mt-1"
              />
            </div>
            <div>
              <label htmlFor="result" className="block text-sm font-medium text-[var(--text-primary)]">
                Result
              </label>
              <select id="result" name="result" defaultValue="pass" className="field mt-1">
                {CALIBRATION_RESULTS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="nextDueDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Next due date <span className="text-faint">(optional)</span>
            </label>
            <input id="nextDueDate" name="nextDueDate" type="date" ref={nextDueDateRef} className="field mt-1" />
            <div className="mt-1.5 flex gap-1.5">
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
              placeholder="e.g. Internal, or the calibration provider's name"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="certificate" className="block text-sm font-medium text-[var(--text-primary)]">
              Certificate <span className="text-faint">(optional)</span>
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
              Log calibration
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
