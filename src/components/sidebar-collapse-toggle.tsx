"use client";

import { useSyncExternalStore } from "react";
import { SidebarCollapseIcon, SidebarExpandIcon } from "@/components/icons";

// Same useSyncExternalStore pattern as ThemeToggle — data-sidebar lives on
// <html>, set before hydration by the bootstrap script in the root layout,
// so there's no mismatch between server and client render.
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sidebar"] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.getAttribute("data-sidebar") === "collapsed";
}

function getServerSnapshot() {
  return false; // matches the default (expanded) in globals.css
}

export function SidebarCollapseToggle() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !collapsed;
    document.documentElement.setAttribute("data-sidebar", next ? "collapsed" : "expanded");
    try {
      localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
    } catch {
      // Private browsing etc. — still works for this visit.
    }
  }

  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
    >
      {collapsed ? <SidebarExpandIcon /> : <SidebarCollapseIcon />}
      <span className="sidebar-label">{label}</span>
    </button>
  );
}
