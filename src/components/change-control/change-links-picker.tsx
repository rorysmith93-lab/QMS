"use client";

import { useState } from "react";

export type LinkableItem = { id: string; title: string; documentNumber?: string | null };

// Multi-select for what a change request touches — same idea as
// RequirementsPicker (toggle buttons + hidden inputs are the real form
// fields), just laid out as rows of text instead of a grid of icons,
// since these are document titles rather than short icon labels.
export function ChangeLinksPicker({
  documents,
  sops,
  workInstructions,
  ncrs,
  initialDocumentIds,
  initialSopIds,
  initialWorkInstructionIds,
  initialNcrIds,
}: {
  documents: LinkableItem[];
  sops: LinkableItem[];
  workInstructions: LinkableItem[];
  ncrs: LinkableItem[];
  initialDocumentIds: string[];
  initialSopIds: string[];
  initialWorkInstructionIds: string[];
  initialNcrIds: string[];
}) {
  const [documentIds, setDocumentIds] = useState<Set<string>>(new Set(initialDocumentIds));
  const [sopIds, setSopIds] = useState<Set<string>>(new Set(initialSopIds));
  const [workInstructionIds, setWorkInstructionIds] = useState<Set<string>>(new Set(initialWorkInstructionIds));
  const [ncrIds, setNcrIds] = useState<Set<string>>(new Set(initialNcrIds));

  function toggle(set: Set<string>, setter: (next: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  return (
    <div className="space-y-4">
      {/* The real form fields — everything below is just UI for editing this set. */}
      {[...documentIds].map((id) => (
        <input key={id} type="hidden" name="documentIds" value={id} />
      ))}
      {[...sopIds].map((id) => (
        <input key={id} type="hidden" name="sopIds" value={id} />
      ))}
      {[...workInstructionIds].map((id) => (
        <input key={id} type="hidden" name="workInstructionIds" value={id} />
      ))}
      {[...ncrIds].map((id) => (
        <input key={id} type="hidden" name="ncrIds" value={id} />
      ))}

      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">Affected documents, SOPs &amp; work instructions</p>
        <p className="mt-0.5 text-xs text-faint">What this change touches — optional, add as many as apply.</p>
        <div className="mt-2 max-h-48 space-y-3 overflow-y-auto rounded-md border p-2" style={{ borderColor: "var(--border)" }}>
          <ItemGroup label="Documents" items={documents} selected={documentIds} onToggle={(id) => toggle(documentIds, setDocumentIds, id)} />
          <ItemGroup label="SOPs" items={sops} selected={sopIds} onToggle={(id) => toggle(sopIds, setSopIds, id)} />
          <ItemGroup
            label="Work Instructions"
            items={workInstructions}
            selected={workInstructionIds}
            onToggle={(id) => toggle(workInstructionIds, setWorkInstructionIds, id)}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">Triggered by NCR(s)</p>
        <p className="mt-0.5 text-xs text-faint">Optional — link the nonconformance(s) that led to this change.</p>
        <div className="mt-2 max-h-40 overflow-y-auto rounded-md border p-2" style={{ borderColor: "var(--border)" }}>
          <ItemGroup items={ncrs} selected={ncrIds} onToggle={(id) => toggle(ncrIds, setNcrIds, id)} />
        </div>
      </div>
    </div>
  );
}

function ItemGroup({
  label,
  items,
  selected,
  onToggle,
}: {
  label?: string;
  items: LinkableItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return label ? (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</p>
        <p className="mt-1 text-xs text-faint">None yet.</p>
      </div>
    ) : (
      <p className="text-xs text-faint">Nothing to link yet.</p>
    );
  }

  return (
    <div>
      {label && <p className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</p>}
      <div className={label ? "mt-1 space-y-1" : "space-y-1"}>
        {items.map((item) => {
          const checked = selected.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              aria-pressed={checked}
              className="flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm"
              style={{
                borderColor: checked ? "var(--brand)" : "var(--border)",
                backgroundColor: checked ? "var(--surface-hover)" : "transparent",
              }}
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] leading-none"
                style={{
                  backgroundColor: checked ? "var(--brand)" : "transparent",
                  border: checked ? "none" : "1px solid var(--border-strong)",
                  color: "var(--brand-contrast)",
                }}
                aria-hidden="true"
              >
                {checked ? "✓" : ""}
              </span>
              <span className="text-[var(--text-primary)]">
                {item.documentNumber ? `${item.documentNumber} — ${item.title}` : item.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
