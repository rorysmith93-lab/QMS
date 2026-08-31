"use client";

import { useState, type ReactNode } from "react";

// Shared pop-out shell for the root cause tools — same overlay pattern as
// the photo editor. Each tool supplies its own form as children, via a
// render-prop so it can call `close()` from its own Cancel button.
export function ToolModalTrigger({
  triggerLabel,
  title,
  children,
}: {
  triggerLabel: string;
  title: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        {triggerLabel}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="surface flex max-h-[85vh] w-full max-w-xl flex-col p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close without saving changes"
                className="text-sm text-muted hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
            {/* px-1 (not pr-1) is load-bearing, not cosmetic: setting
                overflow-y alone silently forces overflow-x to compute as
                "auto" too (a real CSS overflow-spec quirk — one axis
                can't stay "visible" once the other isn't), so this
                container clips horizontally even though only vertical
                scrolling was intended. A field's focus ring extends ~3px
                beyond its own border on every side; with padding on the
                right only, the ring rendered fine on the right and got
                clipped flush on the left, which is what "the pop-up trims
                the left edge when highlighted" was — this element clipping
                its own content, not the modal itself doing anything odd. */}
            <div className="mt-4 flex-1 overflow-y-auto px-1">{children(() => setOpen(false))}</div>
          </div>
        </div>
      )}
    </>
  );
}
