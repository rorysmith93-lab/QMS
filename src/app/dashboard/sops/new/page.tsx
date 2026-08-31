import Link from "next/link";
import { createSop } from "@/app/dashboard/sops/actions";

export default async function NewSopPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/sops" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to SOPs
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">New SOP</h1>
      <p className="mt-1 text-sm text-muted">
        Give it a name to start — you&apos;ll fill in purpose, scope, and the procedure itself on
        the next screen.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createSop} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Incoming Inspection Procedure"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="documentNumber" className="block text-sm font-medium text-[var(--text-primary)]">
            Document number <span className="text-faint">(optional)</span>
          </label>
          <input
            id="documentNumber"
            name="documentNumber"
            type="text"
            placeholder="e.g. SOP-004"
            className="field mt-1"
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Create &amp; start building
        </button>
      </form>
    </div>
  );
}
