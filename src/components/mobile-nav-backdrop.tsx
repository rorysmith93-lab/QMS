"use client";

// The tap-to-close scrim behind the mobile nav drawer. Always rendered;
// entirely invisible and un-clickable (opacity/pointer-events: none) until
// data-mobile-nav="open" — see the .mobile-nav-backdrop rules in
// globals.css. Hidden outright on desktop widths, where there's no
// drawer to dim behind.
export function MobileNavBackdrop() {
  function close() {
    document.documentElement.setAttribute("data-mobile-nav", "closed");
  }

  return <div className="mobile-nav-backdrop" onClick={close} aria-hidden="true" />;
}
