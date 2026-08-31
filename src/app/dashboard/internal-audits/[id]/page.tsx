import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import {
  updateAudit,
  toggleFindingStatus,
  createNcrFromFinding,
} from "@/app/dashboard/internal-audits/actions";
import {
  AUDIT_STATUSES,
  auditStatusLabel,
  auditStatusTone,
  findingTypeLabel,
  findingTypeTone,
  findingStatusTone,
} from "@/lib/internal-audits";
import { StatusBadge } from "@/components/status-badge";
import { FindingForm } from "@/components/internal-audits/finding-form";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";

type Audit = {
  id: string;
  audit_number: string;
  title: string;
  process_area: string | null;
  clause_reference: string | null;
  lead_auditor: string | null;
  scope: string | null;
  summary: string | null;
  status: string;
  planned_date: string;
  actual_date: string | null;
};

type Finding = {
  id: string;
  finding_type: string;
  clause_reference: string | null;
  description: string;
  evidence: string | null;
  corrective_action_required: boolean;
  linked_ncr_id: string | null;
  status: string;
  closed_date: string | null;
};

export default async function AuditDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "internalAudits")) {
    return <AccessDenied />;
  }

  const { data: audit } = await supabase
    .from("internal_audits")
    .select(
      "id, audit_number, title, process_area, clause_reference, lead_auditor, scope, summary, status, planned_date, actual_date"
    )
    .eq("id", id)
    .single<Audit>();

  if (!audit) notFound();

  const { data: findings } = await supabase
    .from("audit_findings")
    .select(
      "id, finding_type, clause_reference, description, evidence, corrective_action_required, linked_ncr_id, status, closed_date"
    )
    .eq("audit_id", id)
    .order("created_at", { ascending: true })
    .returns<Finding[]>();

  const linkedNcrIds = (findings ?? []).map((f) => f.linked_ncr_id).filter((v): v is string => Boolean(v));
  const { data: linkedNcrs } = linkedNcrIds.length
    ? await supabase.from("non_conformances").select("id, ncr_number").in("id", linkedNcrIds)
    : { data: [] as { id: string; ncr_number: string }[] };
  const ncrNumberById = new Map((linkedNcrs ?? []).map((n) => [n.id, n.ncr_number]));

  const boundUpdate = updateAudit.bind(null, audit.id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/internal-audits" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to internal audits
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-faint">{audit.audit_number}</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{audit.title}</h1>
        </div>
        <StatusBadge label={auditStatusLabel(audit.status)} tone={auditStatusTone(audit.status)} />
      </div>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="surface mt-6 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">Audit Details</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-faint">Process / department area</dt>
            <dd className="mt-0.5 text-[var(--text-primary)]">{audit.process_area || "—"}</dd>
          </div>
          <div>
            <dt className="text-faint">Clause(s) covered</dt>
            <dd className="mt-0.5 text-[var(--text-primary)]">{audit.clause_reference || "—"}</dd>
          </div>
          <div>
            <dt className="text-faint">Lead auditor</dt>
            <dd className="mt-0.5 text-[var(--text-primary)]">{audit.lead_auditor || "—"}</dd>
          </div>
          <div>
            <dt className="text-faint">Planned date</dt>
            <dd className="mt-0.5 text-[var(--text-primary)]">
              {new Date(audit.planned_date).toLocaleDateString()}
            </dd>
          </div>
        </dl>

        <form action={boundUpdate} className="mt-6 space-y-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)]">
                Status
              </label>
              <select id="status" name="status" defaultValue={audit.status} className="field mt-1">
                {AUDIT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="actualDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Actual date carried out
              </label>
              <input
                id="actualDate"
                name="actualDate"
                type="date"
                defaultValue={audit.actual_date ?? ""}
                className="field mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="scope" className="block text-sm font-medium text-[var(--text-primary)]">
              Scope / objective
            </label>
            <textarea id="scope" name="scope" rows={3} defaultValue={audit.scope ?? ""} className="field mt-1" />
          </div>

          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-[var(--text-primary)]">
              Summary / conclusion
            </label>
            <textarea
              id="summary"
              name="summary"
              rows={4}
              placeholder="Overall conclusion once the audit is complete — e.g. process is effective, N findings raised, follow-up required by..."
              defaultValue={audit.summary ?? ""}
              className="field mt-1"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Save
          </button>
        </form>
      </div>

      <div className="surface mt-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Findings</h2>
            <p className="mt-1 text-xs text-faint">
              Nonconformities, observations, and opportunities for improvement raised during this audit.
            </p>
          </div>
          <FindingForm auditId={audit.id} />
        </div>

        {!findings || findings.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No findings recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {findings.map((finding) => {
              const boundToggle = toggleFindingStatus.bind(null, audit.id, finding.id);
              const boundCreateNcr = createNcrFromFinding.bind(null, audit.id, finding.id);
              const nextStatus = finding.status === "open" ? "closed" : "open";

              return (
                <li key={finding.id} className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge label={findingTypeLabel(finding.finding_type)} tone={findingTypeTone(finding.finding_type)} />
                      {finding.clause_reference && (
                        <span className="text-xs text-faint">{finding.clause_reference}</span>
                      )}
                    </div>
                    <StatusBadge
                      label={finding.status === "closed" ? `Closed ${finding.closed_date ? new Date(finding.closed_date).toLocaleDateString() : ""}` : "Open"}
                      tone={findingStatusTone(finding.status)}
                    />
                  </div>

                  <p className="mt-2 text-sm text-[var(--text-primary)]">{finding.description}</p>
                  {finding.evidence && (
                    <p className="mt-1 text-sm text-muted">
                      <span className="font-medium text-[var(--text-primary)]">Evidence:</span> {finding.evidence}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    <form action={boundToggle}>
                      <input type="hidden" name="nextStatus" value={nextStatus} />
                      <button type="submit" className="btn-secondary text-xs">
                        {finding.status === "open" ? "Mark closed" : "Reopen"}
                      </button>
                    </form>

                    {finding.corrective_action_required &&
                      (finding.linked_ncr_id ? (
                        <Link
                          href={`/dashboard/non-conformances/${finding.linked_ncr_id}`}
                          className="link-brand text-xs"
                        >
                          View {ncrNumberById.get(finding.linked_ncr_id) ?? "linked NCR"}
                        </Link>
                      ) : (
                        <form action={boundCreateNcr}>
                          <button type="submit" className="btn-secondary text-xs">
                            Create NCR for corrective action
                          </button>
                        </form>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
