"use client";

import { ToolModalTrigger } from "@/components/root-cause/tool-modal";
import { FISHBONE_CATEGORIES, listToLines, type FishboneData } from "@/lib/root-cause-tools";

// Generalized the same way as FiveWhysTool — see its comment.
export function FishboneTool({
  subjectId,
  initialData,
  saveAction,
}: {
  subjectId: string;
  initialData: FishboneData | null;
  saveAction: (subjectId: string, formData: FormData) => Promise<void>;
}) {
  const boundSave = saveAction.bind(null, subjectId);

  return (
    <ToolModalTrigger
      triggerLabel={initialData ? "Edit Fishbone" : "Start Fishbone"}
      title="Fishbone Diagram (Ishikawa)"
    >
      {(close) => (
        <form action={boundSave} className="space-y-4">
          <div>
            <label htmlFor="problem" className="block text-sm font-medium text-[var(--text-primary)]">
              Problem / Effect
            </label>
            <textarea
              id="problem"
              name="problem"
              rows={2}
              defaultValue={initialData?.problem ?? ""}
              className="field mt-1"
            />
          </div>

          {FISHBONE_CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <label htmlFor={cat.key} className="block text-sm font-medium text-[var(--text-primary)]">
                {cat.label}
              </label>
              <textarea
                id={cat.key}
                name={cat.key}
                rows={3}
                defaultValue={listToLines(initialData?.[cat.key])}
                placeholder="One cause per line"
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
