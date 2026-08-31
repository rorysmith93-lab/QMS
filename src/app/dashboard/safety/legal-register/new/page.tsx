import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { createLegalRegisterEntry } from "@/app/dashboard/safety/legal-register/actions";
import { LEGAL_CATEGORIES, LEGAL_STATUSES } from "@/lib/legal-register";

export default async function NewLegalRegisterEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("company_id", profile.company_id)
    .order("full_name");

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/safety/legal-register" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to legal register
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">New legal register entry</h1>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createLegalRegisterEntry} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. OSHA 1910.147 — Lockout/Tagout"
            className="field mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="jurisdiction" className="block text-sm font-medium text-[var(--text-primary)]">
              Jurisdiction
            </label>
            <input id="jurisdiction" name="jurisdiction" type="text" placeholder="e.g. Federal (US)" className="field mt-1" />
          </div>
          <div>
            <label htmlFor="regulator" className="block text-sm font-medium text-[var(--text-primary)]">
              Regulator
            </label>
            <input id="regulator" name="regulator" type="text" placeholder="e.g. OSHA" className="field mt-1" />
          </div>
        </div>

        <div>
          <label htmlFor="referenceNumber" className="block text-sm font-medium text-[var(--text-primary)]">
            Reference number <span className="text-faint">(optional)</span>
          </label>
          <input id="referenceNumber" name="referenceNumber" type="text" className="field mt-1" />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)]">
            Description
          </label>
          <textarea id="description" name="description" rows={3} className="field mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-[var(--text-primary)]">
              Category
            </label>
            <select id="category" name="category" defaultValue="osha_hse" className="field mt-1">
              {LEGAL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)]">
              Status
            </label>
            <select id="status" name="status" defaultValue="in_progress" className="field mt-1">
              {LEGAL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="owner" className="block text-sm font-medium text-[var(--text-primary)]">
            Owner <span className="text-faint">(optional)</span>
          </label>
          <select id="owner" name="owner" defaultValue="" className="field mt-1">
            <option value="">Unassigned</option>
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lastReviewedDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Last reviewed
            </label>
            <input id="lastReviewedDate" name="lastReviewedDate" type="date" className="field mt-1" />
          </div>
          <div>
            <label htmlFor="nextReviewDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Next review due
            </label>
            <input id="nextReviewDate" name="nextReviewDate" type="date" className="field mt-1" />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">
          Create entry
        </button>
      </form>
    </div>
  );
}
