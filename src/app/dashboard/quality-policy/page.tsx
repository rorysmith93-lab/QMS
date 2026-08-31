import { requireProfile } from "@/lib/current-profile";
import { objectiveStatusLabel, objectiveStatusTone } from "@/lib/quality-policy";
import { StatusBadge } from "@/components/status-badge";
import { PublishPolicyForm } from "@/components/quality-policy/publish-policy-form";
import { ObjectiveForm } from "@/components/quality-policy/objective-form";
import { UpdateObjectiveForm } from "@/components/quality-policy/update-objective-form";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";

type Policy = {
  id: string;
  version: number;
  statement: string;
  effective_date: string;
  approved_by: string | null;
};

type Objective = {
  id: string;
  title: string;
  target: string | null;
  owner: string | null;
  target_date: string | null;
  status: string;
  progress_notes: string | null;
};

export default async function QualityPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "qualityPolicy")) {
    return <AccessDenied />;
  }

  const [{ data: policies }, { data: objectives }, { data: members }] = await Promise.all([
    supabase
      .from("quality_policies")
      .select("id, version, statement, effective_date, approved_by")
      .order("version", { ascending: false })
      .returns<Policy[]>(),
    supabase
      .from("quality_objectives")
      .select("id, title, target, owner, target_date, status, progress_notes")
      .order("created_at", { ascending: false })
      .returns<Objective[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", profile.company_id)
      .order("full_name"),
  ]);

  const current = policies?.[0] ?? null;
  const history = policies?.slice(1) ?? [];
  const memberList = members ?? [];
  const nameById = new Map(memberList.map((m) => [m.id, m.full_name || m.email]));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Quality Policy & Objectives</h1>
      <p className="mt-1 text-sm text-muted">
        Your quality policy (clause 5.2) and the measurable objectives that support it (clause 6.2).
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="surface mt-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">Quality Policy</h2>
          <PublishPolicyForm currentStatement={current?.statement ?? ""} approvedBy={current?.approved_by ?? profile.full_name ?? ""} />
        </div>

        {!current ? (
          <p className="mt-4 text-sm text-muted">
            No policy published yet. Click &ldquo;Publish new version&rdquo; to write the first one.
          </p>
        ) : (
          <>
            <blockquote
              className="mt-4 whitespace-pre-wrap border-l-4 pl-4 text-sm text-[var(--text-primary)]"
              style={{ borderColor: "var(--brand)" }}
            >
              {current.statement}
            </blockquote>
            <p className="mt-3 text-xs text-faint">
              Version {current.version} · Effective {new Date(current.effective_date).toLocaleDateString()}
              {current.approved_by && ` · Approved by ${current.approved_by}`}
            </p>
          </>
        )}

        {history.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-muted hover:text-[var(--text-primary)]">
              Version history ({history.length})
            </summary>
            <ul className="mt-2 space-y-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              {history.map((p) => (
                <li key={p.id} className="text-xs text-muted">
                  <p className="font-medium text-[var(--text-primary)]">
                    Version {p.version} · Effective {new Date(p.effective_date).toLocaleDateString()}
                    {p.approved_by && ` · Approved by ${p.approved_by}`}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{p.statement}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="surface mt-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Quality Objectives</h2>
            <p className="mt-1 text-xs text-faint">Measurable goals, tracked to completion.</p>
          </div>
          <ObjectiveForm members={memberList} />
        </div>

        {!objectives || objectives.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No objectives set yet. Click &ldquo;Add objective&rdquo; to set the first one.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {objectives.map((objective) => (
              <li key={objective.id} className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{objective.title}</p>
                    {objective.target && <p className="mt-1 text-sm text-muted">{objective.target}</p>}
                  </div>
                  <StatusBadge label={objectiveStatusLabel(objective.status)} tone={objectiveStatusTone(objective.status)} />
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-faint">
                  <span>Owner: {objective.owner ? nameById.get(objective.owner) ?? "Unknown" : "Unassigned"}</span>
                  <span>
                    Target date: {objective.target_date ? new Date(objective.target_date).toLocaleDateString() : "—"}
                  </span>
                </div>

                {objective.progress_notes && (
                  <p className="mt-2 text-sm text-muted">
                    <span className="font-medium text-[var(--text-primary)]">Progress:</span>{" "}
                    {objective.progress_notes}
                  </p>
                )}

                <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  <UpdateObjectiveForm objective={objective} members={memberList} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
