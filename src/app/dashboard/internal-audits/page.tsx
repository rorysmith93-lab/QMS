import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { AUDIT_STATUSES, auditStatusLabel, auditStatusTone } from "@/lib/internal-audits";
import { StatusBadge } from "@/components/status-badge";
import { nextSortDir, sortIndicator, withParams } from "@/lib/list-controls";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";

const BASE_PATH = "/dashboard/internal-audits";
const SORTABLE_COLUMNS = ["audit_number", "title", "status", "planned_date"] as const;
type SortColumn = (typeof SORTABLE_COLUMNS)[number];

type AuditRow = {
  id: string;
  audit_number: string;
  title: string;
  process_area: string | null;
  lead_auditor: string | null;
  status: string;
  planned_date: string;
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

export default async function InternalAuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "internalAudits")) {
    return <AccessDenied />;
  }

  const status = AUDIT_STATUSES.some((s) => s.value === sp.status) ? sp.status : undefined;
  const sort: SortColumn = SORTABLE_COLUMNS.includes(sp.sort as SortColumn) ? (sp.sort as SortColumn) : "planned_date";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const hasExplicitSort = Boolean(sp.sort);

  let query = supabase
    .from("internal_audits")
    .select("id, audit_number, title, process_area, lead_auditor, status, planned_date");

  if (status) query = query.eq("status", status);

  query = query.order(sort, { ascending: hasExplicitSort ? dir === "asc" : false });

  const { data: audits } = await query.returns<AuditRow[]>();

  const statusFilters = [{ value: undefined, label: "All" }, ...AUDIT_STATUSES];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Internal Audits</h1>
          <p className="mt-1 text-sm text-muted">
            Your audit schedule and findings — the evidence an ISO 9001 auditor expects to see for
            clause 9.2.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`${BASE_PATH}/export${withParams(sp, {})}`} className="btn-secondary">
            Export CSV
          </Link>
          <Link href="/dashboard/internal-audits/new" className="btn-primary">
            Schedule audit
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {statusFilters.map((f) => {
          const active = (f.value ?? "") === (status ?? "");
          return (
            <Link
              key={f.label}
              href={`${BASE_PATH}${withParams(sp, { status: f.value })}`}
              className="rounded-full border px-3 py-1 text-xs"
              style={{
                borderColor: active ? "var(--brand)" : "var(--border)",
                backgroundColor: active ? "var(--surface-hover)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="surface mt-4 overflow-hidden">
        {!audits || audits.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {status ? "Nothing matches this filter." : "No audits scheduled yet. Click “Schedule audit” to plan the first one."}
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "audit_number", "Audit #")}
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "title", "Title")}
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Process area
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Lead auditor
                </th>
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "status", "Status")}
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "planned_date", "Planned date")}
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="list-row">
                  <td className="px-4 py-3 text-muted">{audit.audit_number}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/internal-audits/${audit.id}`} className="link-brand row-link">
                      {audit.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{audit.process_area || "—"}</td>
                  <td className="px-4 py-3 text-muted">{audit.lead_auditor || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={auditStatusLabel(audit.status)} tone={auditStatusTone(audit.status)} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(audit.planned_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
