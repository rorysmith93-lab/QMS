import Link from "next/link";

export type OnboardingStep = {
  label: string;
  description: string;
  href: string;
  done: boolean;
};

// Purely presentational — no client interactivity needed, so this stays a
// plain server component. Disappears entirely once every step is done;
// there's nothing useful left for it to say at that point.
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <div className="surface mt-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[var(--text-primary)]">Get set up for ISO 9001</h2>
        <span className="text-xs text-faint">
          {doneCount} of {steps.length} done
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--border)" }}>
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${(doneCount / steps.length) * 100}%`, backgroundColor: "var(--brand)" }}
        />
      </div>

      <ul className="mt-4 space-y-1">
        {steps.map((step) => (
          <li key={step.label}>
            <Link href={step.href} className="flex items-center gap-3 rounded-md p-2 hover:bg-[var(--surface-hover)]">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs"
                style={{
                  borderColor: step.done ? "var(--success)" : "var(--border-strong)",
                  backgroundColor: step.done ? "var(--success)" : "transparent",
                  color: "white",
                }}
              >
                {step.done ? "✓" : ""}
              </span>
              <div className="min-w-0">
                <p
                  className="text-sm"
                  style={{
                    color: step.done ? "var(--text-faint)" : "var(--text-primary)",
                    textDecoration: step.done ? "line-through" : "none",
                  }}
                >
                  {step.label}
                </p>
                <p className="text-xs text-faint">{step.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
