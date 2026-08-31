"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";

type Theme = "light" | "dark";

// The theme "lives" as a data-theme attribute on <html>, set by the
// blocking bootstrap script in the root layout before first paint (and
// updated by toggle() below). useSyncExternalStore is React's sanctioned
// way to read a value like this that lives outside React state — it
// knows to use getServerSnapshot while rendering on the server (where
// there's no DOM/localStorage to check) and reconciles cleanly once the
// real client value is available, with no hydration-mismatch warnings.
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark"; // matches the default theme in globals.css
}

export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing etc. — the toggle still works for this visit,
      // it just won't be remembered next time.
    }
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={toggle}
        role="switch"
        aria-checked={theme === "light"}
        aria-label={label}
        title={label}
        className="flex h-8 w-8 items-center justify-center rounded-md border text-muted hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        style={{ borderColor: "var(--border-strong)" }}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={theme === "light"}
      aria-label={label}
      title={label}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      <span className="sidebar-label">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
