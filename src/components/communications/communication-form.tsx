"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { createCommunication } from "@/app/dashboard/communications/actions";
import { COMMUNICATION_DIRECTIONS } from "@/lib/communications";

type Member = { id: string; full_name: string | null; email: string };

export function CommunicationForm({ members }: { members: Member[] }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ToolModalTrigger triggerLabel="Log communication" title="Log a Communication">
      {(close) => (
        <form action={createCommunication} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="occurredOn" className="block text-sm font-medium text-[var(--text-primary)]">
                Date
              </label>
              <input id="occurredOn" name="occurredOn" type="date" defaultValue={today} className="field mt-1" />
            </div>
            <div>
              <label htmlFor="direction" className="block text-sm font-medium text-[var(--text-primary)]">
                Direction
              </label>
              <select id="direction" name="direction" defaultValue="internal" className="field mt-1">
                {COMMUNICATION_DIRECTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-[var(--text-primary)]">
              With whom
            </label>
            <input
              id="audience"
              name="audience"
              type="text"
              required
              placeholder="e.g. All staff, Acme Ltd, the certification body"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="method" className="block text-sm font-medium text-[var(--text-primary)]">
              How
            </label>
            <input
              id="method"
              name="method"
              type="text"
              required
              placeholder="e.g. Email, notice board, phone call, meeting"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-[var(--text-primary)]">
              What was communicated
            </label>
            <textarea id="summary" name="summary" rows={3} required className="field mt-1" />
          </div>

          <div>
            <label htmlFor="relatedTo" className="block text-sm font-medium text-[var(--text-primary)]">
              Related to <span className="text-faint">(optional)</span>
            </label>
            <input
              id="relatedTo"
              name="relatedTo"
              type="text"
              placeholder="e.g. Change Request 'Update torque spec', NCR-014"
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="communicatedBy" className="block text-sm font-medium text-[var(--text-primary)]">
              Communicated by <span className="text-faint">(optional)</span>
            </label>
            <select id="communicatedBy" name="communicatedBy" defaultValue="" className="field mt-1">
              <option value="">Me</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={close} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Log it
            </button>
          </div>
        </form>
      )}
    </ToolModalTrigger>
  );
}
