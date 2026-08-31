import { requireProfile } from "@/lib/current-profile";
import {
  RISK_STATUSES,
  isHighPriority,
  riskLevelLabel,
  riskStatusLabel,
  riskStatusTone,
  riskTypeLabel,
  riskTypeTone,
} from "@/lib/quality-risks";
import { StatusBadge } from "@/components/status-badge";
import { RiskForm } from "@/components/risk-register/risk-form";
import { UpdateRiskForm } from "@/components/risk-register/update-risk-form";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";
import Link from "next/link";

type RiskRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  likelihood: string | null;
  impact: string | null;
  mitigating_action: string | null;
  owner: string | null;
  review_date: string | null;
  status: string;
};

export default async function RiskRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { error, status: statusFilter } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "riskRegister")) {
    return <AccessDenied />;
  }

  const validStatus = RISK_STATUSES.some((s) => s.value === statusFilter) ? statusFilter : undefined;

  let query = supabase
    .from("quality_risks")
    .select("id, title, description, type, likelihood, impact, mitigating_action, owner, review_date, status");

  if (validStatus) query = query.eq("status", validStatus);

  const { data: risks } = await query
    .order("review_date", { ascending: true, nullsFirst: false })
    .returns<RiskRow[]>();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("company_id", profile.company_id)
    .order("full_name");

  const memberList = members ?? [];
  const nameById = new Map(memberList.map((m) => [m.id, m.full_name || m.email]));

  const openCount = (risks ?? []).filter((r) => r.status !== "closed").length;
  const highPriorityCount = (risks ?? []).filter(
    (r) => r.status !== "closed" && isHighPriority(r.likelihood, r.impact)
  ).length;

  const statusFilters = [{ value: undefined, label: "All" }, ...RISK_STATUSES];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Risk & Opportunity Register</h1>
          <p className="mt-1 text-sm text-muted">
            Actions to address risks and opportunities — clause 6.1. Feeds directly into{" "}
            <Link href="/dashboard/management-reviews" className="link-brand">
              Management Review
            </Link>
            , which already asks about the effectiveness of what&apos;s logged here.
          </p>
        </div>
        <RiskForm members={memberList} />
      </div>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="surface p-4">
          <p className="text-xs text-faint">Open items</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{openCount}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-faint">High likelihood &amp; high impact, still open</p>
          <p
            className="mt-1 text-2xl font-semibold"
            style={{ color: highPriorityCount > 0 ? "var(--danger)" : "var(--text-primary)" }}
          >
            {highPriorityCount}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {statusFilters.map((f) => {
          const active = (f.value ?? "") === (validStatus ?? "");
          return (
            <Link
              key={f.label}
              href={f.value ? `/dashboard/risk-register?status=${f.value}` : "/dashboard/risk-register"}
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
        {!risks || risks.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {validStatus
              ? "Nothing matches this filter."
              : "Nothing logged yet. Click “Add risk / opportunity” to start the register."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Title
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Likelihood
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Impact
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Owner
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Next review
                  </th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {risks.map((risk) => {
                  const flagged = risk.status !== "closed" && isHighPriority(risk.likelihood, risk.impact);
                  return (
                    <tr key={risk.id} className="list-row">
                      <td className="px-4 py-3">
                        <p className="text-[var(--text-primary)]">
                          {risk.title}
                          {flagged && (
                            <span className="ml-2 text-xs" style={{ color: "var(--danger)" }}>
                              ⚠ high priority
                            </span>
                          )}
                        </p>
                        {risk.description && <p className="mt-0.5 text-xs text-faint">{risk.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={riskTypeLabel(risk.type)} tone={riskTypeTone(risk.type)} />
                      </td>
                      <td className="px-4 py-3 text-muted">{riskLevelLabel(risk.likelihood)}</td>
                      <td className="px-4 py-3 text-muted">{riskLevelLabel(risk.impact)}</td>
                      <td className="px-4 py-3 text-muted">
                        {risk.owner ? nameById.get(risk.owner) ?? "Unknown" : "Unassigned"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={riskStatusLabel(risk.status)} tone={riskStatusTone(risk.status)} />
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {risk.review_date ? new Date(risk.review_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UpdateRiskForm risk={risk} members={memberList} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
