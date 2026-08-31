"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { createObjective } from "@/app/dashboard/quality-policy/actions";

type Member = { id: string; full_name: string | null; email: string };

export function ObjectiveForm({ members }: { members: Member[] }) {
  return (
    <ToolModalTrigger triggerLabel="Add objective" title="Add Quality Objective">
      {(close) => (
        <form action={createObjective} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
              Objective
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Reduce customer returns"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="target" className="block text-sm font-medium text-[var(--text-primary)]">
              Target / how it&apos;s measured
            </label>
            <input
              id="target"
              name="target"
              type="text"
              placeholder="e.g. Fewer than 2% of shipped orders returned due to defect"
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
              <label htmlFor="targetDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Target date <span className="text-faint">(optional)</span>
              </label>
              <input id="targetDate" name="targetDate" type="date" className="field mt-1" />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={close} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add objective
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
