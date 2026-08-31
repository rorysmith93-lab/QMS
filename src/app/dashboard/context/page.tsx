import { requireProfile } from "@/lib/current-profile";
import { PARTY_CATEGORIES, partyCategoryLabel } from "@/lib/context-and-scope";
import { PublishContextScopeForm } from "@/components/context/publish-context-scope-form";
import { InterestedPartyForm } from "@/components/context/interested-party-form";
import { UpdateInterestedPartyForm } from "@/components/context/update-interested-party-form";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";

type ContextScope = {
  id: string;
  version: number;
  external_issues: string | null;
  internal_issues: string | null;
  scope_statement: string | null;
  exclusions: string | null;
  effective_date: string;
  approved_by: string | null;
};

type Party = {
  id: string;
  name: string;
  category: string;
  needs_expectations: string | null;
};

export default async function ContextPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "contextAndScope")) {
    return <AccessDenied />;
  }

  const [{ data: versions }, { data: parties }] = await Promise.all([
    supabase
      .from("qms_context_scope")
      .select("id, version, external_issues, internal_issues, scope_statement, exclusions, effective_date, approved_by")
      .order("version", { ascending: false })
      .returns<ContextScope[]>(),
    supabase
      .from("interested_parties")
      .select("id, name, category, needs_expectations")
      .order("category")
      .returns<Party[]>(),
  ]);

  const current = versions?.[0] ?? null;
  const history = versions?.slice(1) ?? [];
  const partyList = parties ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Context of the Organization</h1>
      <p className="mt-1 text-sm text-muted">
        The internal and external issues relevant to the QMS, who has a stake in it, and the
        boundaries of what it covers — clauses 4.1 through 4.3.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="surface mt-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">Context &amp; Scope Statement</h2>
          <PublishContextScopeForm
            currentExternalIssues={current?.external_issues ?? ""}
            currentInternalIssues={current?.internal_issues ?? ""}
            currentScopeStatement={current?.scope_statement ?? ""}
            currentExclusions={current?.exclusions ?? ""}
            approvedBy={current?.approved_by ?? profile.full_name ?? ""}
          />
        </div>

        {!current ? (
          <p className="mt-4 text-sm text-muted">
            Nothing published yet. Click &ldquo;Publish new version&rdquo; to write the first one.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {current.scope_statement && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-faint">Scope</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                  {current.scope_statement}
                </p>
              </div>
            )}
            {current.external_issues && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-faint">External issues</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                  {current.external_issues}
                </p>
              </div>
            )}
            {current.internal_issues && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-faint">Internal issues</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                  {current.internal_issues}
                </p>
              </div>
            )}
            {current.exclusions && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-faint">Exclusions</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                  {current.exclusions}
                </p>
              </div>
            )}
            <p className="text-xs text-faint">
              Version {current.version} · Effective {new Date(current.effective_date).toLocaleDateString()}
              {current.approved_by && ` · Approved by ${current.approved_by}`}
            </p>
          </div>
        )}

        {history.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-muted hover:text-[var(--text-primary)]">
              Version history ({history.length})
            </summary>
            <ul className="mt-2 space-y-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              {history.map((v) => (
                <li key={v.id} className="text-xs text-muted">
                  <p className="font-medium text-[var(--text-primary)]">
                    Version {v.version} · Effective {new Date(v.effective_date).toLocaleDateString()}
                    {v.approved_by && ` · Approved by ${v.approved_by}`}
                  </p>
                  {v.scope_statement && <p className="mt-1 whitespace-pre-wrap">{v.scope_statement}</p>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="surface mt-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Interested Parties</h2>
            <p className="mt-1 text-xs text-faint">Who has a stake in the QMS, and what they need from it — clause 4.2.</p>
          </div>
          <InterestedPartyForm />
        </div>

        {partyList.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Nobody logged yet. Click &ldquo;Add interested party&rdquo; to start — customers,
            regulators, suppliers, staff, owners are the usual starting list.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-faint">
                    Name
                  </th>
                  <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-faint">
                    Category
                  </th>
                  <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-faint">
                    Needs &amp; expectations
                  </th>
                  <th scope="col" className="py-2" />
                </tr>
              </thead>
              <tbody>
                {partyList.map((party) => (
                  <tr key={party.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 text-[var(--text-primary)]">{party.name}</td>
                    <td className="py-2 text-muted">{partyCategoryLabel(party.category)}</td>
                    <td className="py-2 text-muted">{party.needs_expectations || "—"}</td>
                    <td className="py-2 text-right">
                      <UpdateInterestedPartyForm party={party} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-faint">Categories: {PARTY_CATEGORIES.map((c) => c.label).join(" · ")}.</p>
      </div>
    </div>
  );
}
