import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { createAudit } from "@/app/dashboard/internal-audits/actions";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";

export default async function NewAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile } = await requireProfile();

  if (!canAccess(profile.role, "internalAudits")) {
    return <AccessDenied />;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/internal-audits" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to internal audits
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">Schedule an audit</h1>
      <p className="mt-1 text-sm text-muted">
        An audit number is assigned automatically. Findings get added once the audit is under way.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createAudit} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Q3 2026 Production Process Audit"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="processArea" className="block text-sm font-medium text-[var(--text-primary)]">
            Process / department area
          </label>
          <input
            id="processArea"
            name="processArea"
            type="text"
            placeholder="e.g. Assembly line 2"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="clauseReference" className="block text-sm font-medium text-[var(--text-primary)]">
            Clause(s) / requirements covered <span className="text-faint">(optional)</span>
          </label>
          <input
            id="clauseReference"
            name="clauseReference"
            type="text"
            placeholder="e.g. 8.5 Production and service provision"
            className="field mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="leadAuditor" className="block text-sm font-medium text-[var(--text-primary)]">
              Lead auditor
            </label>
            <input
              id="leadAuditor"
              name="leadAuditor"
              type="text"
              defaultValue={profile.full_name ?? ""}
              className="field mt-1"
            />
          </div>
          <div>
            <label htmlFor="plannedDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Planned date
            </label>
            <input id="plannedDate" name="plannedDate" type="date" defaultValue={today} className="field mt-1" />
          </div>
        </div>

        <div>
          <label htmlFor="scope" className="block text-sm font-medium text-[var(--text-primary)]">
            Scope / objective <span className="text-faint">(optional)</span>
          </label>
          <textarea
            id="scope"
            name="scope"
            rows={3}
            placeholder="What this audit is checking, and against which documents/procedures."
            className="field mt-1"
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Schedule audit
        </button>
      </form>
    </div>
  );
}
