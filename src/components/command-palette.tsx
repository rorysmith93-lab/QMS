"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { globalSearch, type SearchResult } from "@/app/dashboard/search-actions";

type NavItem = { href: string; label: string };

// A Cmd+K / Ctrl+K command palette: jump to any section instantly (matched
// client-side, no network needed), or search NCRs/audits/documents/work
// instructions/equipment by name once the query is 2+ characters. Renders
// its own trigger button, same self-contained pattern as ToolModalTrigger.
export function CommandPalette({ navItems }: { navItems: NavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resets are plain event-handler calls (not effect bodies), so there's
  // no cascading-render concern — same reasoning as ThemeToggle's toggle().
  function openPalette() {
    setQuery("");
    setResults([]);
    setActiveIndex(0);
    setOpen(true);
  }

  // Cmd+K / Ctrl+K opens (or closes) the palette from anywhere in the app.
  // `open` is a dependency so the closure below always sees its current
  // value — re-subscribing on every toggle is negligible at this scale.
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          openPalette();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Focus the input once it's actually in the DOM.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open]);

  // Debounced live search — only once the query is long enough to be
  // worth a round trip, and cancelled if the user keeps typing. Stale
  // results from a longer query are hidden below via `effectiveResults`
  // rather than cleared here, so there's no setState in the effect body.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const id = setTimeout(() => {
      globalSearch(query)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const navMatches: SearchResult[] = navItems
    .filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    .map((item) => ({ type: "Go to", label: item.label, href: item.href }));

  const effectiveResults = query.trim().length >= 2 ? results : [];
  const combined = [...navMatches, ...effectiveResults];
  const activeIdx = combined.length ? Math.min(activeIndex, combined.length - 1) : 0;

  function go(index: number) {
    const item = combined[index];
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, combined.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(activeIdx);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        title="Search (⌘K)"
        className="mt-3 flex w-full items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-sm text-muted hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        style={{ borderColor: "var(--border)" }}
      >
        <SearchIcon />
        <span className="sidebar-label flex-1 text-left">Search...</span>
        <kbd
          className="sidebar-label rounded border px-1.5 py-0.5 text-[10px] text-faint"
          style={{ borderColor: "var(--border-strong)" }}
        >
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="surface flex max-h-[60vh] w-full max-w-lg flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
              <SearchIcon />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search or jump to..."
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {combined.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">
                  {query.trim().length >= 2 ? `No results for "${query}"` : "Type to search, or pick a page below."}
                </p>
              ) : (
                <ul>
                  {combined.map((item, i) => (
                    <li key={`${item.type}-${item.href}-${i}`}>
                      <button
                        type="button"
                        onClick={() => go(i)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm"
                        style={{
                          backgroundColor: i === activeIdx ? "var(--surface-hover)" : "transparent",
                          color: "var(--text-primary)",
                        }}
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="shrink-0 text-xs text-faint">{item.sublabel ?? item.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className="flex items-center gap-3 border-t px-4 py-2 text-xs text-faint"
              style={{ borderColor: "var(--border)" }}
            >
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
