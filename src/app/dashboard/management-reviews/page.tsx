import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { reviewStatusLabel, reviewStatusTone } from "@/lib/management-reviews";
import { StatusBadge } from "@/components/status-badge";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";

type ReviewRow = {
  id: string;
  review_number: string;
  title: string;
  status: string;
  review_date: string;
  attendees: string | null;
};

export default async function ManagementReviewsPage() {
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "managementReview")) {
    return <AccessDenied />;
  }

  const { data: reviews } = await supabase
    .from("management_reviews")
    .select("id, review_number, title, status, review_date, attendees")
    .order("review_date", { ascending: false })
    .returns<ReviewRow[]>();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Management Review</h1>
          <p className="mt-1 text-sm text-muted">
            Periodic leadership review of the QMS — clause 9.3. Pulls its performance data straight
            from your non-conformances and internal audits.
          </p>
        </div>
        <Link href="/dashboard/management-reviews/new" className="btn-primary">
          Start review
        </Link>
      </div>

      <div className="surface mt-6 overflow-hidden">
        {!reviews || reviews.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No management reviews yet. Click &ldquo;Start review&rdquo; to schedule the first one.
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Review #
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Attendees
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Review date
                </th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="list-row">
                  <td className="px-4 py-3 text-muted">{review.review_number}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/management-reviews/${review.id}`} className="link-brand row-link">
                      {review.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{review.attendees || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={reviewStatusLabel(review.status)} tone={reviewStatusTone(review.status)} />
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(review.review_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
