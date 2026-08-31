"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { saveEightD } from "@/app/dashboard/non-conformances/root-cause-actions";
import { EIGHT_D_SECTIONS, type EightDData } from "@/lib/root-cause-tools";

export function EightDTool({ ncId, initialData }: { ncId: string; initialData: EightDData | null }) {
  const boundSave = saveEightD.bind(null, ncId);

  return (
    <ToolModalTrigger
      triggerLabel={initialData ? "Edit 8D Report" : "Start 8D Report"}
      title="8D Problem Solving"
    >
      {(close) => (
        <form action={boundSave} className="space-y-4">
          {EIGHT_D_SECTIONS.map((section) => (
            <div key={section.key}>
              <label
                htmlFor={section.key}
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                {section.label}
              </label>
              <p className="text-xs text-faint">{section.hint}</p>
              <textarea
                id={section.key}
                name={section.key}
                rows={section.key === "team" ? 2 : 3}
                defaultValue={initialData?.[section.key] ?? ""}
                className="field mt-1"
              />
            </div>
          ))}

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
