"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { updateObjective } from "@/app/dashboard/quality-policy/actions";
import { OBJECTIVE_STATUSES } from "@/lib/quality-policy";

type Member = { id: string; full_name: string | null; email: string };

type Objective = {
  id: string;
  title: string;
  target: string | null;
  owner: string | null;
  target_date: string | null;
  status: string;
  progress_notes: string | null;
};

export function UpdateObjectiveForm({ objective, members }: { objective: Objective; members: Member[] }) {
  const boundUpdate = updateObjective.bind(null, objective.id);

  return (
    <ToolModalTrigger triggerLabel="Update" title="Update Objective">
      {(close) => (
        <form action={boundUpdate} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
              Objective
            </label>
            <input id="title" name="title" type="text" required defaultValue={objective.title} className="field mt-1" />
          </div>

          <div>
            <label htmlFor="target" className="block text-sm font-medium text-[var(--text-primary)]">
              Target / how it&apos;s measured
            </label>
            <input id="target" name="target" type="text" defaultValue={objective.target ?? ""} className="field mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-[var(--text-primary)]">
                Owner
              </label>
              <select id="owner" name="owner" defaultValue={objective.owner ?? ""} className="field mt-1">
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
                Target date
              </label>
              <input
                id="targetDate"
                name="targetDate"
                type="date"
                defaultValue={objective.target_date ?? ""}
                className="field mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)]">
              Status
            </label>
            <select id="status" name="status" defaultValue={objective.status} className="field mt-1">
              {OBJECTIVE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="progressNotes" className="block text-sm font-medium text-[var(--text-primary)]">
              Progress notes
            </label>
            <textarea
              id="progressNotes"
              name="progressNotes"
              rows={3}
              defaultValue={objective.progress_notes ?? ""}
              className="field mt-1"
            />
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
