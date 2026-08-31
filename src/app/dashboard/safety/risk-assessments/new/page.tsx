import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { createRiskAssessment } from "@/app/dashboard/safety/risk-assessments/actions";

export default async function NewRiskAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile } = await requireProfile();

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/safety/risk-assessments" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to risk assessments
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">New risk assessment</h1>
      <p className="mt-1 text-sm text-muted">
        Give it a name to start — you&apos;ll add hazards and score each one on the next screen.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createRiskAssessment} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Warehouse Loading Bay Risk Assessment"
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
            placeholder="e.g. RA-004"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="areaOrProcess" className="block text-sm font-medium text-[var(--text-primary)]">
            Area / process <span className="text-faint">(optional)</span>
          </label>
          <input id="areaOrProcess" name="areaOrProcess" type="text" placeholder="e.g. Warehouse — Loading Bay" className="field mt-1" />
        </div>

        <div>
          <label htmlFor="assessor" className="block text-sm font-medium text-[var(--text-primary)]">
            Assessor
          </label>
          <input
            id="assessor"
            name="assessor"
            type="text"
            defaultValue={profile.full_name ?? ""}
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="reviewDueDate" className="block text-sm font-medium text-[var(--text-primary)]">
            Review due date <span className="text-faint">(optional)</span>
          </label>
          <input id="reviewDueDate" name="reviewDueDate" type="date" className="field mt-1" />
        </div>

        <button type="submit" className="btn-primary w-full">
          Create &amp; start building
        </button>
      </form>
    </div>
  );
}
