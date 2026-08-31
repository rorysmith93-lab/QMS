import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { isOverdue, ncStatusLabel, ncStatusTone, NC_STATUSES, sourceLabel } from "@/lib/non-conformances";
import { StatusBadge } from "@/components/status-badge";
import { nextSortDir, sortIndicator, withParams } from "@/lib/list-controls";

const BASE_PATH = "/dashboard/non-conformances";
const SORTABLE_COLUMNS = ["ncr_number", "title", "status", "due_date"] as const;
type SortColumn = (typeof SORTABLE_COLUMNS)[number];

type NcRow = {
  id: string;
  ncr_number: string;
  title: string;
  source: string;
  status: string;
  department: string | null;
  due_date: string | null;
  updated_at: string;
  assigned_to: string | null;
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

export default async function NonConformancesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireProfile();

  const status = NC_STATUSES.some((s) => s.value === sp.status) ? sp.status : undefined;
  const sort: SortColumn = SORTABLE_COLUMNS.includes(sp.sort as SortColumn) ? (sp.sort as SortColumn) : "ncr_number";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  // Only actually reflect an active sort in the UI/URL once the user picks
  // one — otherwise fall back to the original "most recently touched"
  // ordering, which is a more useful default than sorting by NCR number.
  const hasExplicitSort = Boolean(sp.sort);

  let query = supabase
    .from("non_conformances")
    .select("id, ncr_number, title, source, status, department, due_date, updated_at, assigned_to");

  if (status) query = query.eq("status", status);

  query = hasExplicitSort
    ? query.order(sort, { ascending: dir === "asc" })
    : query.order("updated_at", { ascending: false });

  const { data: ncs } = await query.returns<NcRow[]>();

  const assigneeIds = Array.from(
    new Set((ncs ?? []).map((n) => n.assigned_to).filter((v): v is string => Boolean(v)))
  );

  const { data: profiles } = assigneeIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assigneeIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Someone"]));

  const statusFilters = [{ value: undefined, label: "All" }, ...NC_STATUSES];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Non-Conformances</h1>
          <p className="mt-1 text-sm text-muted">
            Things that went wrong, and what&apos;s being done about them.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`${BASE_PATH}/export${withParams(sp, {})}`} className="btn-secondary">
            Export CSV
          </Link>
          <Link href="/dashboard/non-conformances/new" className="btn-primary">
            Log non-conformance
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
        {!ncs || ncs.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {status
              ? "Nothing matches this filter."
              : "Nothing logged yet. Click “Log non-conformance” to add the first one."}
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "ncr_number", "NCR #")}
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "title", "Title")}
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Source
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Department
                </th>
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "status", "Status")}
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Assigned to
                </th>
                {sortableHeader(sp, hasExplicitSort ? sort : "", dir, "due_date", "Due")}
              </tr>
            </thead>
            <tbody>
              {ncs.map((nc) => {
                const overdue = isOverdue(nc.due_date, nc.status);
                return (
                  <tr key={nc.id} className="list-row">
                    <td className="px-4 py-3 text-muted">{nc.ncr_number}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/non-conformances/${nc.id}`} className="link-brand row-link">
                        {nc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{sourceLabel(nc.source)}</td>
                    <td className="px-4 py-3 text-muted">{nc.department || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={ncStatusLabel(nc.status)} tone={ncStatusTone(nc.status)} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {nc.assigned_to ? nameById.get(nc.assigned_to) : "Unassigned"}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: overdue ? "var(--danger)" : "var(--text-secondary)" }}
                    >
                      {nc.due_date ? new Date(nc.due_date).toLocaleDateString() : "—"}
                      {overdue && " (overdue)"}
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
