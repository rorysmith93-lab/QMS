import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { COMMUNICATION_DIRECTIONS, communicationDirectionLabel, communicationDirectionTone } from "@/lib/communications";
import { StatusBadge } from "@/components/status-badge";
import { CommunicationForm } from "@/components/communications/communication-form";
import { deleteCommunication } from "@/app/dashboard/communications/actions";
import { ConfirmSubmitButton } from "@/app/dashboard/work-instructions/confirm-submit-button";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";

type CommunicationRow = {
  id: string;
  occurred_on: string;
  direction: string;
  audience: string;
  method: string;
  summary: string;
  related_to: string | null;
  communicated_by: string | null;
};

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; direction?: string }>;
}) {
  const { error, direction: directionFilter } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "communications")) {
    return <AccessDenied />;
  }

  const validDirection = COMMUNICATION_DIRECTIONS.some((d) => d.value === directionFilter) ? directionFilter : undefined;

  let query = supabase
    .from("communications")
    .select("id, occurred_on, direction, audience, method, summary, related_to, communicated_by");
  if (validDirection) query = query.eq("direction", validDirection);

  const [{ data: communications }, { data: members }] = await Promise.all([
    query.order("occurred_on", { ascending: false }).returns<CommunicationRow[]>(),
    supabase.from("profiles").select("id, full_name, email").eq("company_id", profile.company_id).order("full_name"),
  ]);

  const memberList = members ?? [];
  const nameById = new Map(memberList.map((m) => [m.id, m.full_name || m.email]));

  const directionFilters = [{ value: undefined, label: "All" }, ...COMMUNICATION_DIRECTIONS];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Communications</h1>
          <p className="mt-1 text-sm text-muted">
            What&apos;s communicated, when, with whom, how, and by whom — clause 7.4.
          </p>
        </div>
        <CommunicationForm members={memberList} />
      </div>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {directionFilters.map((f) => {
          const active = (f.value ?? "") === (validDirection ?? "");
          return (
            <Link
              key={f.label}
              href={f.value ? `/dashboard/communications?direction=${f.value}` : "/dashboard/communications"}
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
        {!communications || communications.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {validDirection
              ? "Nothing matches this filter."
              : "Nothing logged yet. Click “Log communication” to add the first one."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Direction
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Communication
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    By
                  </th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {communications.map((c) => {
                  const boundDelete = deleteCommunication.bind(null, c.id);
                  return (
                    <tr key={c.id} className="list-row">
                      <td className="px-4 py-3 whitespace-nowrap text-muted">
                        {new Date(c.occurred_on).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={communicationDirectionLabel(c.direction)}
                          tone={communicationDirectionTone(c.direction)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[var(--text-primary)]">
                          {c.audience} · <span className="text-muted">{c.method}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-faint">{c.summary}</p>
                        {c.related_to && <p className="mt-0.5 text-xs text-faint">Related to: {c.related_to}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {c.communicated_by ? nameById.get(c.communicated_by) ?? "Unknown" : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={boundDelete}>
                          <ConfirmSubmitButton
                            confirmText="Delete this log entry? This can't be undone."
                            className="text-xs text-muted hover:text-[var(--text-primary)]"
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
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
