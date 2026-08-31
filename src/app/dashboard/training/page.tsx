import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { trainingRecordStatus, trainingTypeLabel, TRAINING_TYPES } from "@/lib/training";
import { StatusBadge } from "@/components/status-badge";
import { TrainingForm } from "@/components/training/training-form";
import { deleteTrainingRecord } from "@/app/dashboard/training/actions";
import { nextSortDir, sortIndicator, withParams } from "@/lib/list-controls";

const BASE_PATH = "/dashboard/training";
const SORTABLE_COLUMNS = ["training_title", "completed_date", "expiry_date"] as const;
type SortColumn = (typeof SORTABLE_COLUMNS)[number];
const STATUS_FILTERS = [
  { value: "expiring_soon", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
] as const;

type TrainingRow = {
  id: string;
  profile_id: string | null;
  training_title: string;
  training_type: string;
  provider: string | null;
  completed_date: string;
  expiry_date: string | null;
  certificate_path: string | null;
  certificate_name: string | null;
};

function sortableHeader(
  sp: Record<string, string | undefined>,
  sort: string,
  dir: string,
  column: SortColumn,
  label: string
) {
  const nextDir = nextSortDir(sort, dir, column);
  return (
    <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
      <Link href={`${BASE_PATH}${withParams(sp, { sort: column, dir: nextDir })}`} className="hover:text-[var(--text-primary)]">
        {label}
        {sortIndicator(sort, dir, column)}
      </Link>
    </th>
  );
}

function filterPill(
  sp: Record<string, string | undefined>,
  paramKey: string,
  value: string | undefined,
  label: string,
  active: boolean
) {
  return (
    <Link
      key={label}
      href={`${BASE_PATH}${withParams(sp, { [paramKey]: value })}`}
      className="rounded-full border px-3 py-1 text-xs"
      style={{
        borderColor: active ? "var(--brand)" : "var(--border)",
        backgroundColor: active ? "var(--surface-hover)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {label}
    </Link>
  );
}

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; type?: string; status?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const { error, type: typeFilter, status: statusFilter } = sp;
  const { profile, supabase } = await requireProfile();

  const [{ data: records }, { data: members }] = await Promise.all([
    supabase
      .from("training_records")
      .select(
        "id, profile_id, training_title, training_type, provider, completed_date, expiry_date, certificate_path, certificate_name"
      )
      .returns<TrainingRow[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", profile.company_id)
      .order("full_name"),
  ]);

  const memberList = members ?? [];
  const nameById = new Map(memberList.map((m) => [m.id, m.full_name || m.email]));
  const rows = records ?? [];

  // Certificates live in a private bucket, so each one needs a short-lived
  // signed URL rather than a plain public link — same approach as Document
  // Control's file downloads.
  const certificateUrlById = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.certificate_path)
      .map(async (r) => {
        const { data: signed } = await supabase.storage
          .from("certificates")
          .createSignedUrl(r.certificate_path!, 60 * 5);
        if (signed?.signedUrl) certificateUrlById.set(r.id, signed.signedUrl);
      })
  );

  // Stats always reflect every record on file, regardless of the active
  // filter — a stable company-wide snapshot, not a count of what's visible.
  const expiredCount = rows.filter((r) => trainingRecordStatus(r.expiry_date).label === "Expired").length;
  const expiringSoonCount = rows.filter((r) => trainingRecordStatus(r.expiry_date).label === "Expiring soon").length;

  // Small dataset at this scale, so filtering/sorting happens in JS on the
  // one fetch rather than round-tripping to the database again.
  const sort: SortColumn = SORTABLE_COLUMNS.includes(sp.sort as SortColumn) ? (sp.sort as SortColumn) : "expiry_date";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const hasExplicitSort = Boolean(sp.sort);

  const sorted = [...rows].sort((a, b) => {
    if (hasExplicitSort) {
      const av = a[sort] ?? "";
      const bv = b[sort] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    }
    // Default: soonest expiry first, records with no expiry date last.
    if (!a.expiry_date && !b.expiry_date) return 0;
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;
    return a.expiry_date.localeCompare(b.expiry_date);
  });

  const validType = TRAINING_TYPES.some((t) => t.value === typeFilter) ? typeFilter : undefined;
  const validStatus = STATUS_FILTERS.some((s) => s.value === statusFilter) ? statusFilter : undefined;

  const visibleRows = sorted
    .filter((r) => !validType || r.training_type === validType)
    .filter((r) => !validStatus || trainingRecordStatus(r.expiry_date).label === (validStatus === "expired" ? "Expired" : "Expiring soon"));

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Training & Competence</h1>
          <p className="mt-1 text-sm text-muted">
            Evidence that people are qualified for their roles — clause 7.2.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`${BASE_PATH}/export${withParams(sp, {})}`} className="btn-secondary">
            Export CSV
          </Link>
          <TrainingForm members={memberList} />
        </div>
      </div>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="surface p-4">
          <dt className="text-xs text-faint">Records on file</dt>
          <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{rows.length}</dd>
        </div>
        <div className="surface p-4">
          <dt className="text-xs text-faint">Expiring within 60 days</dt>
          <dd className="mt-1 text-xl font-semibold" style={{ color: expiringSoonCount ? "var(--warning)" : "var(--text-primary)" }}>
            {expiringSoonCount}
          </dd>
        </div>
        <div className="surface p-4">
          <dt className="text-xs text-faint">Expired</dt>
          <dd className="mt-1 text-xl font-semibold" style={{ color: expiredCount ? "var(--danger)" : "var(--text-primary)" }}>
            {expiredCount}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">Type:</span>
          {filterPill(sp, "type", undefined, "All", !validType)}
          {TRAINING_TYPES.map((t) => filterPill(sp, "type", t.value, t.label, validType === t.value))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">Status:</span>
          {filterPill(sp, "status", undefined, "All", !validStatus)}
          {STATUS_FILTERS.map((s) => filterPill(sp, "status", s.value, s.label, validStatus === s.value))}
        </div>
      </div>

      <div className="surface mt-4 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No training logged yet. Click &ldquo;Log training&rdquo; to add the first record.
          </p>
        ) : visibleRows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Nothing matches this filter.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Team member
                </th>
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "training_title", "Training")}
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Type
                </th>
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "completed_date", "Completed")}
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "expiry_date", "Expires")}
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Status
                </th>
                <th scope="col" className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((record) => {
                const status = trainingRecordStatus(record.expiry_date);
                const boundDelete = deleteTrainingRecord.bind(null, record.id);
                return (
                  <tr key={record.id} className="list-row">
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {record.profile_id ? nameById.get(record.profile_id) ?? "Former team member" : "Former team member"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {record.training_title}
                      {certificateUrlById.has(record.id) && (
                        <>
                          {" "}
                          <a
                            href={certificateUrlById.get(record.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="link-brand text-xs"
                          >
                            View certificate
                          </a>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{trainingTypeLabel(record.training_type)}</td>
                    <td className="px-4 py-3 text-muted">{new Date(record.completed_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted">
                      {record.expiry_date ? new Date(record.expiry_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={status.label} tone={status.tone} />
                    </td>
                    <td className="px-4 py-3">
                      <form action={boundDelete}>
                        <button type="submit" className="text-xs text-faint hover:text-[var(--danger)]">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
