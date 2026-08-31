"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { createRisk } from "@/app/dashboard/risk-register/actions";
import { RISK_TYPES, RISK_LEVELS } from "@/lib/quality-risks";

type Member = { id: string; full_name: string | null; email: string };

export function RiskForm({ members }: { members: Member[] }) {
  return (
    <ToolModalTrigger triggerLabel="Add risk / opportunity" title="Add Risk or Opportunity">
      {(close) => (
        <form action={createRisk} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Single-source supplier for a critical component"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)]">
              Description <span className="text-faint">(optional)</span>
            </label>
            <textarea id="description" name="description" rows={2} className="field mt-1" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-[var(--text-primary)]">
                Type
              </label>
              <select id="type" name="type" defaultValue="risk" className="field mt-1">
                {RISK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="likelihood" className="block text-sm font-medium text-[var(--text-primary)]">
                Likelihood
              </label>
              <select id="likelihood" name="likelihood" defaultValue="" className="field mt-1">
                <option value="">—</option>
                {RISK_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="impact" className="block text-sm font-medium text-[var(--text-primary)]">
                Impact
              </label>
              <select id="impact" name="impact" defaultValue="" className="field mt-1">
                <option value="">—</option>
                {RISK_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="mitigatingAction" className="block text-sm font-medium text-[var(--text-primary)]">
              Mitigating action <span className="text-faint">(optional)</span>
            </label>
            <textarea
              id="mitigatingAction"
              name="mitigatingAction"
              rows={2}
              placeholder="What's being done about it — or planned, for an opportunity"
              className="field mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-[var(--text-primary)]">
                Owner <span className="text-faint">(optional)</span>
              </label>
              <select id="owner" name="owner" defaultValue="" className="field mt-1">
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reviewDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Next review date <span className="text-faint">(optional)</span>
              </label>
              <input id="reviewDate" name="reviewDate" type="date" className="field mt-1" />
            </div>
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
