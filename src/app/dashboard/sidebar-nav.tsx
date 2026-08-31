"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string; icon: ReactNode };
export type NavSection = { id: string; label: string; items: NavItem[] };

const STORAGE_KEY = "collapsedNavSections";
// Same-tab writes don't fire the native "storage" event (only OTHER tabs
// get that) — this custom event is what lets useSyncExternalStore below
// notice a toggle click in THIS tab too, same idea as the MutationObserver
// ThemeToggle/SidebarCollapseToggle use for their own attribute-on-<html>
// state, just for a localStorage value instead of a DOM attribute.
const CHANGE_EVENT = "qms:nav-sections-changed";

function readCollapsedRaw() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]"; // private browsing etc. — sections just stay expanded
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getServerSnapshot() {
  return "[]"; // every section renders expanded during SSR/first paint
}

// Three tiers, not one flat list: `topItems` (Dashboard/My Items) and
// `bottomItems` (Settings) stay pinned and ungrouped exactly as before;
// `standaloneItems` are items that don't belong in a themed category
// (currently just Safety, since folding its own sub-pages into tabs —
// see SafetyTabs — already got it down to one entry); `sections` are the
// actual collapsible categories that turn a long flat list back into
// something scannable.
export function SidebarNav({
  topItems,
  standaloneItems,
  sections,
  bottomItems,
}: {
  topItems: NavItem[];
  standaloneItems: NavItem[];
  sections: NavSection[];
  bottomItems: NavItem[];
}) {
  const pathname = usePathname();

  // Closes the mobile nav drawer whenever the route changes — without
  // this, tapping a link would navigate but leave the drawer covering
  // the new page. Harmless on desktop, where the drawer state is unused.
  useEffect(() => {
    document.documentElement.setAttribute("data-mobile-nav", "closed");
  }, [pathname]);

  const collapsedRaw = useSyncExternalStore(subscribe, readCollapsedRaw, getServerSnapshot);
  const collapsedIds = useMemo(() => {
    try {
      return new Set<string>(JSON.parse(collapsedRaw));
    } catch {
      return new Set<string>();
    }
  }, [collapsedRaw]);

  function toggleSection(id: string) {
    const next = new Set(collapsedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // Still works for this visit even if it can't be remembered.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  function renderItem(item: NavItem) {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={item.label}
        className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          active
            ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
            : "text-muted hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        }`}
      >
        {item.icon}
        <span className="sidebar-label">{item.label}</span>
      </Link>
    );
  }

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {topItems.map(renderItem)}

      {standaloneItems.length > 0 && <div className="mt-1 flex flex-col gap-0.5">{standaloneItems.map(renderItem)}</div>}

      {sections.map((section) => {
        if (section.items.length === 0) return null;

        // A section containing the current page always shows its items —
        // collapsing a section you happen to be inside would just hide
        // where you are.
        const containsActive = section.items.some((item) => isActive(item.href));
        const collapsed = collapsedIds.has(section.id) && !containsActive;

        return (
          <div key={section.id} className="mt-2" data-section-collapsed={collapsed ? "true" : "false"}>
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              aria-expanded={!collapsed}
              className="sidebar-section-header flex w-full items-center justify-between rounded-md px-2.5 py-1 text-left text-xs font-semibold uppercase tracking-wide text-faint hover:text-[var(--text-primary)]"
            >
              <span className="sidebar-label">{section.label}</span>
              <span className="sidebar-label" aria-hidden="true" style={{ fontSize: "0.9em" }}>
                {collapsed ? "+" : "−"}
              </span>
            </button>
            <div className="sidebar-section-items">{section.items.map(renderItem)}</div>
          </div>
        );
      })}

      {bottomItems.length > 0 && <div className="mt-2 flex flex-col gap-0.5">{bottomItems.map(renderItem)}</div>}
    </nav>
  );
}
