import { StatusBadge } from "@/components/status-badge";

// "I have read and understood this" — clause 7.3 (Awareness). Embedded on
// each of the four content types' own detail/view page rather than a
// central attestation module, since that's where someone actually reads
// the thing. No client JS needed: the attest button is a plain form
// posting to a bound server action, so this whole component renders on
// the server just like the page that embeds it.
export function AttestationPanel({
  attested,
  attestedAt,
  attestedCount,
  totalMembers,
  attestedNames,
  onAttest,
}: {
  attested: boolean;
  attestedAt: string | null;
  attestedCount: number;
  totalMembers: number;
  attestedNames: string[];
  onAttest: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="surface mt-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">Read &amp; understood</h2>
          <p className="mt-1 text-xs text-faint">
            {attestedCount} of {totalMembers} team member{totalMembers === 1 ? "" : "s"} have attested to this
            version.
          </p>
        </div>
        {attested ? (
          <StatusBadge
            label={`You attested${attestedAt ? ` on ${new Date(attestedAt).toLocaleDateString()}` : ""}`}
            tone="positive"
          />
        ) : (
          <form action={onAttest}>
            <button type="submit" className="btn-primary">
              I have read and understood this
            </button>
          </form>
        )}
      </div>

      {attestedNames.length > 0 && (
        <details className="mt-3 text-xs text-muted">
          <summary className="cursor-pointer">Who&apos;s attested</summary>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            {attestedNames.map((name, i) => (
              <li key={`${name}-${i}`}>{name}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
