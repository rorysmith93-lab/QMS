// A small coloured dot + label, Linear's way of showing status without
// resorting to loud filled pill backgrounds. The dot is decorative — the
// text label is what actually conveys the status, so this reads fine
// without relying on colour alone.
const TONE_DOT_CLASSES = {
  neutral: "bg-[var(--text-faint)]",
  positive: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  critical: "bg-[var(--danger)]",
  info: "bg-[#6690f2]",
} as const;

export type StatusTone = keyof typeof TONE_DOT_CLASSES;

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT_CLASSES[tone]}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
