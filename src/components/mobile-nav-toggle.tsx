"use client";

import { MenuIcon } from "@/components/icons";

// Sits in a normal in-flow sticky header bar on narrow screens (see
// where this is rendered in dashboard/layout.tsx) — the sidebar itself is
// off-canvas below the tablet breakpoint (see globals.css), so this is
// what opens it. Deliberately a plain in-flow button rather than a
// position:fixed floating one — iOS Safari has a real bug where a fixed
// element can stop receiving touches entirely, and a normal in-flow
// button doesn't have that problem. Same attribute-on-<html> architecture
// as the theme/collapse toggles otherwise: no local React state, just
// flips data-mobile-nav and plain CSS reacts.
export function MobileNavToggle() {
  function open() {
    document.documentElement.setAttribute("data-mobile-nav", "open");
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open menu"
      title="Open menu"
      className="flex h-10 w-10 items-center justify-center rounded-md border shadow-sm"
      style={{
        borderColor: "var(--border-strong)",
        backgroundColor: "var(--surface)",
        // Some mobile browsers add a ~300ms delay (or double-tap-zoom
        // ambiguity) before firing click on elements without this — belt
        // and suspenders alongside the width=device-width viewport meta,
        // which normally already disables that delay on its own.
        touchAction: "manipulation",
      }}
    >
      <MenuIcon />
    </button>
  );
}
