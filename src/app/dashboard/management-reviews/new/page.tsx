import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { createReview } from "@/app/dashboard/management-reviews/actions";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile } = await requireProfile();

  if (!canAccess(profile.role, "managementReview")) {
    return <AccessDenied />;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/management-reviews" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to management reviews
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">Start a management review</h1>
      <p className="mt-1 text-sm text-muted">
        A review number is assigned automatically. The inputs and outputs required by clause 9.3 get
        filled in on the next screen.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createReview} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Q3 2026 Management Review"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="reviewDate" className="block text-sm font-medium text-[var(--text-primary)]">
            Review date
          </label>
          <input id="reviewDate" name="reviewDate" type="date" defaultValue={today} className="field mt-1" />
        </div>

        <div>
          <label htmlFor="attendees" className="block text-sm font-medium text-[var(--text-primary)]">
            Attendees <span className="text-faint">(optional)</span>
          </label>
          <input
            id="attendees"
            name="attendees"
            type="text"
            placeholder="e.g. Rory Smith (QM), Jane Doe (Ops)"
            className="field mt-1"
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Start review
        </button>
      </form>
    </div>
  );
}
