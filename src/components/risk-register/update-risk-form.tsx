"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { updateRisk } from "@/app/dashboard/risk-register/actions";
import { RISK_TYPES, RISK_LEVELS, RISK_STATUSES } from "@/lib/quality-risks";

type Member = { id: string; full_name: string | null; email: string };

type Risk = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  likelihood: string | null;
  impact: string | null;
  mitigating_action: string | null;
  owner: string | null;
  review_date: string | null;
  status: string;
};

export function UpdateRiskForm({ risk, members }: { risk: Risk; members: Member[] }) {
  const boundUpdate = updateRisk.bind(null, risk.id);

  return (
    <ToolModalTrigger triggerLabel="Update" title="Update Risk / Opportunity">
      {(close) => (
        <form action={boundUpdate} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
              Title
            </label>
            <input id="title" name="title" type="text" required defaultValue={risk.title} className="field mt-1" />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)]">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={risk.description ?? ""}
              className="field mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-[var(--text-primary)]">
                Type
              </label>
              <select id="type" name="type" defaultValue={risk.type} className="field mt-1">
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
              <select id="likelihood" name="likelihood" defaultValue={risk.likelihood ?? ""} className="field mt-1">
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
              <select id="impact" name="impact" defaultValue={risk.impact ?? ""} className="field mt-1">
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
              Mitigating action
            </label>
            <textarea
              id="mitigatingAction"
              name="mitigatingAction"
              rows={2}
              defaultValue={risk.mitigating_action ?? ""}
              className="field mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-[var(--text-primary)]">
                Owner
              </label>
              <select id="owner" name="owner" defaultValue={risk.owner ?? ""} className="field mt-1">
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
                Next review date
              </label>
              <input
                id="reviewDate"
                name="reviewDate"
                type="date"
                defaultValue={risk.review_date ?? ""}
                className="field mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)]">
              Status
            </label>
            <select id="status" name="status" defaultValue={risk.status} className="field mt-1">
              {RISK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
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
