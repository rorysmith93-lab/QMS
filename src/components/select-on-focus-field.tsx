"use client";

// A read-only field (endpoint URL, API key, etc.) that selects its full
// value the moment it's focused, so a click-then-copy is a single motion.
// Needs to be a Client Component — the onFocus handler can't be passed as
// a prop from a Server Component, which is what tripped this up.
export function SelectOnFocusField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)]">{label}</label>
      <input
        type="text"
        readOnly
        value={value}
        className="field mt-1 font-mono text-sm"
        onFocus={(e) => e.currentTarget.select()}
      />
    </div>
  );
}
