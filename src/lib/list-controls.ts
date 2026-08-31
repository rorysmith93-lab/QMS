// Shared helpers for building filter/sort links on list pages. Everything
// lives in the URL (search params) rather than client state, so filters
// and sort order are plain server-rendered <Link>s — no client JS needed,
// and the resulting URL is shareable/bookmarkable.

export type SortDir = "asc" | "desc";

// Merges a set of overrides into the current search params and returns a
// query string (including the leading "?", or "" if empty). Passing
// `undefined` for a key removes it — e.g. clearing a filter back to "All".
export function withParams(
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
): string {
  const merged: Record<string, string | undefined> = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// The direction a column's sort link should switch TO — flips if it's
// already the active column, otherwise starts ascending.
export function nextSortDir(activeSort: string | undefined, activeDir: string | undefined, column: string): SortDir {
  if (activeSort === column && activeDir === "asc") return "desc";
  return "asc";
}

// A tiny "▲"/"▼" to show next to the currently-sorted column header.
export function sortIndicator(activeSort: string | undefined, activeDir: string | undefined, column: string) {
  if (activeSort !== column) return "";
  return activeDir === "desc" ? " ▼" : " ▲";
}
