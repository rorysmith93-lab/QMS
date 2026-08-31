"use client";

import { useRef } from "react";
import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { logTraining } from "@/app/dashboard/training/actions";
import { TRAINING_TYPES } from "@/lib/training";

type Member = { id: string; full_name: string | null; email: string };

// Adds `months` calendar months to a yyyy-mm-dd string and returns the
// result in the same format, for the quick-fill expiry buttons.
function addMonths(dateStr: string, months: number) {
  const base = dateStr ? new Date(dateStr) : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

export function TrainingForm({ members }: { members: Member[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const completedDateRef = useRef<HTMLInputElement>(null);
  const expiryDateRef = useRef<HTMLInputElement>(null);

  function fillExpiry(months: number) {
    if (!expiryDateRef.current) return;
    expiryDateRef.current.value = addMonths(completedDateRef.current?.value || today, months);
  }

  return (
    <ToolModalTrigger triggerLabel="Log training" title="Log Training">
      {(close) => (
        <form action={logTraining} className="space-y-4">
          <div>
            <label htmlFor="profileId" className="block text-sm font-medium text-[var(--text-primary)]">
              Team member
            </label>
            <select id="profileId" name="profileId" required defaultValue="" className="field mt-1">
              <option value="" disabled>
                Select a team member
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="trainingTitle" className="block text-sm font-medium text-[var(--text-primary)]">
              Training
            </label>
            <input
              id="trainingTitle"
              name="trainingTitle"
              type="text"
              required
              placeholder="e.g. Forklift Operator Certification"
              className="field mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="trainingType" className="block text-sm font-medium text-[var(--text-primary)]">
                Type
              </label>
              <select id="trainingType" name="trainingType" defaultValue="other" className="field mt-1">
                {TRAINING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="provider" className="block text-sm font-medium text-[var(--text-primary)]">
                Provider <span className="text-faint">(optional)</span>
              </label>
              <input id="provider" name="provider" type="text" className="field mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="completedDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Completed date
              </label>
              <input
                id="completedDate"
                name="completedDate"
                type="date"
                defaultValue={today}
                ref={completedDateRef}
                className="field mt-1"
              />
            </div>
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Expiry date <span className="text-faint">(optional)</span>
              </label>
              <input id="expiryDate" name="expiryDate" type="date" ref={expiryDateRef} className="field mt-1" />
              <div className="mt-1.5 flex gap-1.5">
                <button type="button" onClick={() => fillExpiry(6)} className="btn-secondary text-xs">
                  +6 months
                </button>
                <button type="button" onClick={() => fillExpiry(12)} className="btn-secondary text-xs">
                  +1 year
                </button>
              </div>
            </div>
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
            <p className="mt-1 text-xs text-faint">PDF or photo of the certificate, if you have one on hand.</p>
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
              Log training
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
