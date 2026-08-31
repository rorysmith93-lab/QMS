import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import { updateReview } from "@/app/dashboard/management-reviews/actions";
import {
  REVIEW_STATUSES,
  REVIEW_INPUT_FIELDS,
  REVIEW_OUTPUT_FIELDS,
  reviewStatusLabel,
  reviewStatusTone,
} from "@/lib/management-reviews";
import { StatusBadge } from "@/components/status-badge";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";

type Review = {
  id: string;
  review_number: string;
  title: string;
  review_date: string;
  attendees: string | null;
  status: string;
} & Record<string, string | null>;

export default async function ReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "managementReview")) {
    return <AccessDenied />;
  }

  const { data: review } = await supabase
    .from("management_reviews")
    .select("*")
    .eq("id", id)
    .single<Review>();

  if (!review) notFound();

  // Live QMS snapshot — pulled fresh each time rather than typed in, so it
  // can never be out of date by the time the review actually happens.
  const [{ data: ncs }, { data: audits }, { data: findings }, { data: risks }] = await Promise.all([
    supabase.from("non_conformances").select("id, status"),
    supabase.from("internal_audits").select("id, status"),
    supabase.from("audit_findings").select("id, status"),
    supabase.from("quality_risks").select("id, status"),
  ]);

  const ncTotal = ncs?.length ?? 0;
  const ncOpen = ncs?.filter((n) => n.status !== "verified_closed").length ?? 0;
  const auditTotal = audits?.length ?? 0;
  const auditClosed = audits?.filter((a) => a.status === "closed").length ?? 0;
  const findingsOpen = findings?.filter((f) => f.status === "open").length ?? 0;
  const risksOpen = risks?.filter((r) => r.status !== "closed").length ?? 0;

  const boundUpdate = updateReview.bind(null, review.id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/management-reviews" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to management reviews
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-faint">{review.review_number}</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{review.title}</h1>
        </div>
        <StatusBadge label={reviewStatusLabel(review.status)} tone={reviewStatusTone(review.status)} />
      </div>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="surface mt-6 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">QMS Snapshot</h2>
        <p className="mt-1 text-xs text-faint">
          Live counts as of right now — reference these while filling in the sections below.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
            <dt className="text-xs text-faint">Non-conformances open</dt>
            <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{ncOpen}</dd>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
            <dt className="text-xs text-faint">Non-conformances logged (all time)</dt>
            <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{ncTotal}</dd>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
            <dt className="text-xs text-faint">Audits closed / total</dt>
            <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {auditClosed} / {auditTotal}
            </dd>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
            <dt className="text-xs text-faint">Audit findings still open</dt>
            <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{findingsOpen}</dd>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
            <dt className="text-xs text-faint">Risks &amp; opportunities open</dt>
            <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{risksOpen}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <Link href="/dashboard/non-conformances" className="link-brand">
            View non-conformances →
          </Link>
          <Link href="/dashboard/internal-audits" className="link-brand">
            View internal audits →
          </Link>
          <Link href="/dashboard/risk-register" className="link-brand">
            View risk register →
          </Link>
        </div>
      </div>

      <form action={boundUpdate} className="surface mt-6 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">Review Details</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="reviewDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Review date
            </label>
            <input
              id="reviewDate"
              name="reviewDate"
              type="date"
              defaultValue={review.review_date}
              className="field mt-1"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)]">
              Status
            </label>
            <select id="status" name="status" defaultValue={review.status} className="field mt-1">
              {REVIEW_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="attendees" className="block text-sm font-medium text-[var(--text-primary)]">
            Attendees
          </label>
          <input
            id="attendees"
            name="attendees"
            type="text"
            defaultValue={review.attendees ?? ""}
            className="field mt-1"
          />
        </div>

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-faint">
          Inputs (ISO 9001 clause 9.3.2)
        </h3>
        <div className="mt-3 space-y-4">
          {REVIEW_INPUT_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="block text-sm font-medium text-[var(--text-primary)]">
                {f.label}
              </label>
              {"hint" in f && f.hint && <p className="text-xs text-faint">{f.hint}</p>}
              <textarea id={f.key} name={f.key} rows={3} defaultValue={review[f.key] ?? ""} className="field mt-1" />
            </div>
          ))}
        </div>

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-faint">
          Outputs (ISO 9001 clause 9.3.3)
        </h3>
        <div className="mt-3 space-y-4">
          {REVIEW_OUTPUT_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="block text-sm font-medium text-[var(--text-primary)]">
                {f.label}
              </label>
              <textarea id={f.key} name={f.key} rows={3} defaultValue={review[f.key] ?? ""} className="field mt-1" />
            </div>
          ))}
        </div>

        <button type="submit" className="btn-primary mt-6 w-full">
          Save
        </button>
      </form>
    </div>
  );
}
