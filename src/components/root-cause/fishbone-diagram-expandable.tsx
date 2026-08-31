"use client";

import { useState } from "react";
import { FishboneDiagram } from "@/components/root-cause/fishbone-diagram";
import type { FishboneData } from "@/lib/root-cause-tools";

// Wraps the fishbone SVG with a click-to-expand modal — the inline version
// stays small and readable in the NCR page, but a completed diagram (lots
// of causes) gets cramped, so clicking it opens the same diagram much
// larger in an overlay, same pattern as the tool pop-outs.
export function FishboneDiagramExpandable({ data }: { data: FishboneData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Expand fishbone diagram"
        title="Click to expand"
        className="block w-full cursor-zoom-in rounded-lg transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      >
        <FishboneDiagram data={data} />
      </button>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fishbone diagram, expanded"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="surface flex max-h-[90vh] w-full max-w-6xl flex-col p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Fishbone Diagram</h2>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Close"
                className="text-sm text-muted hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-auto">
              <FishboneDiagram data={data} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
