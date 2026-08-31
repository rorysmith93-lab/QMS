"use client";

import { useState } from "react";
import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import type { FiveWhysData } from "@/lib/root-cause-tools";

// Generalized to work against any subject (a non-conformance or a safety
// incident) — the caller supplies which one via `subjectId` and which
// server action to save to via `saveAction`, rather than this component
// importing a specific module's action itself.
export function FiveWhysTool({
  subjectId,
  initialData,
  saveAction,
}: {
  subjectId: string;
  initialData: FiveWhysData | null;
  saveAction: (subjectId: string, formData: FormData) => Promise<void>;
}) {
  const [whyCount, setWhyCount] = useState(Math.max(5, initialData?.whys.length ?? 5));
  const boundSave = saveAction.bind(null, subjectId);

  return (
    <ToolModalTrigger triggerLabel={initialData ? "Edit 5 Whys" : "Start 5 Whys"} title="5 Whys">
      {(close) => (
        <form action={boundSave} className="space-y-4">
          <div>
            <label htmlFor="problem" className="block text-sm font-medium text-[var(--text-primary)]">
              Problem Statement
            </label>
            <textarea
              id="problem"
              name="problem"
              rows={2}
              defaultValue={initialData?.problem ?? ""}
              className="field mt-1"
            />
          </div>

          {Array.from({ length: whyCount }).map((_, i) => (
            <div key={i}>
              <label
                htmlFor={`why-${i}`}
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Why #{i + 1}
              </label>
              <textarea
                id={`why-${i}`}
                name="why"
                rows={2}
                defaultValue={initialData?.whys[i] ?? ""}
                placeholder={i === 0 ? "Why did the problem happen?" : "Why did THAT happen?"}
                className="field mt-1"
              />
            </div>
          ))}

          <button type="button" onClick={() => setWhyCount((c) => c + 1)} className="btn-secondary">
            + Add another Why
          </button>

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
