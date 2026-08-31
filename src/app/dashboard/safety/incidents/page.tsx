import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import {
  incidentSeverityLabel,
  incidentSeverityTone,
  incidentStatusLabel,
  incidentStatusTone,
  incidentTypeLabel,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  isIncidentOverdue,
} from "@/lib/safety-incidents";
import { StatusBadge } from "@/components/status-badge";
import { withParams } from "@/lib/list-controls";
import { SafetyTabs } from "@/components/safety-tabs";

const BASE_PATH = "/dashboard/safety/incidents";

type IncidentRow = {
  id: string;
  incident_number: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  department: string | null;
  due_date: string | null;
  updated_at: string;
  assigned_to: string | null;
};

function pill(
  sp: Record<string, string | undefined>,
  paramKey: string,
  value: string | undefined,
  label: string,
  active: boolean
) {
  return (
    <Link
      key={`${paramKey}-${label}`}
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

export default async function SafetyIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; severity?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireProfile();

  const typeFilter = INCIDENT_TYPES.some((t) => t.value === sp.type) ? sp.type : undefined;
  const statusFilter = INCIDENT_STATUSES.some((s) => s.value === sp.status) ? sp.status : undefined;
  const severityFilter = INCIDENT_SEVERITIES.some((s) => s.value === sp.severity) ? sp.severity : undefined;

  let query = supabase
    .from("safety_incidents")
    .select("id, incident_number, title, type, severity, status, department, due_date, updated_at, assigned_to")
    .order("updated_at", { ascending: false });

  if (typeFilter) query = query.eq("type", typeFilter);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (severityFilter) query = query.eq("severity", severityFilter);

  const { data: incidents } = await query.returns<IncidentRow[]>();
  const rows = incidents ?? [];

  const { data: allIncidents } = await supabase.from("safety_incidents").select("status, due_date, closed_at");
  const allRows = allIncidents ?? [];
  const openCount = allRows.filter((r) => r.status !== "closed").length;
  const overdueCount = allRows.filter((r) => isIncidentOverdue(r.due_date, r.status)).length;
  const closedThisMonthCount = allRows.filter((r) => {
    if (!r.closed_at) return false;
    const closed = new Date(r.closed_at);
    const now = new Date();
    return closed.getFullYear() === now.getFullYear() && closed.getMonth() === now.getMonth();
  }).length;

  const assigneeIds = Array.from(new Set(rows.map((r) => r.assigned_to).filter((v): v is string => Boolean(v))));
  const { data: profiles } = assigneeIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assigneeIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Someone"]));

  return (
    <div>
      <SafetyTabs active="incidents" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Incidents &amp; Near Misses</h1>
          <p className="mt-1 text-sm text-muted">
            Incidents, near misses, and hazard observations — with root-cause tools and CAPA tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`${BASE_PATH}/export${withParams(sp, {})}`} className="btn-secondary">
            Export CSV
          </Link>
          <Link href={`${BASE_PATH}/new`} className="btn-primary">
            Report incident
          </Link>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="surface p-4">
          <dt className="text-xs text-faint">Open</dt>
          <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{openCount}</dd>
        </div>
        <div className="surface p-4">
          <dt className="text-xs text-faint">Overdue</dt>
          <dd className="mt-1 text-xl font-semibold" style={{ color: overdueCount ? "var(--danger)" : "var(--text-primary)" }}>
            {overdueCount}
          </dd>
        </div>
        <div className="surface p-4">
          <dt className="text-xs text-faint">Closed this month</dt>
          <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{closedThisMonthCount}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">Type:</span>
          {pill(sp, "type", undefined, "All", !typeFilter)}
          {INCIDENT_TYPES.map((t) => pill(sp, "type", t.value, t.label, typeFilter === t.value))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">Status:</span>
          {pill(sp, "status", undefined, "All", !statusFilter)}
          {INCIDENT_STATUSES.map((s) => pill(sp, "status", s.value, s.label, statusFilter === s.value))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">Severity:</span>
          {pill(sp, "severity", undefined, "All", !severityFilter)}
          {INCIDENT_SEVERITIES.map((s) => pill(sp, "severity", s.value, s.label, severityFilter === s.value))}
        </div>
      </div>

      <div className="surface mt-4 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {typeFilter || statusFilter || severityFilter
              ? "Nothing matches this filter."
              : "Nothing logged yet. Click “Report incident” to add the first one."}
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  #
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Severity
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Assigned to
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Due
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((incident) => {
                const overdue = isIncidentOverdue(incident.due_date, incident.status);
                return (
                  <tr key={incident.id} className="list-row">
                    <td className="px-4 py-3 text-muted">{incident.incident_number}</td>
                    <td className="px-4 py-3">
                      <Link href={`${BASE_PATH}/${incident.id}`} className="link-brand row-link">
                        {incident.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{incidentTypeLabel(incident.type)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={incidentSeverityLabel(incident.severity)} tone={incidentSeverityTone(incident.severity)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={incidentStatusLabel(incident.status)} tone={incidentStatusTone(incident.status)} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {incident.assigned_to ? nameById.get(incident.assigned_to) : "Unassigned"}
                    </td>
                    <td className="px-4 py-3" style={{ color: overdue ? "var(--danger)" : "var(--text-secondary)" }}>
                      {incident.due_date ? new Date(incident.due_date).toLocaleDateString() : "—"}
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
