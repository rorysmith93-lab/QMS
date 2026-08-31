import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { legalCategoryLabel, LEGAL_STATUSES, legalStatusLabel, legalStatusTone } from "@/lib/legal-register";
import { dateStatus } from "@/lib/dates";
import { StatusBadge } from "@/components/status-badge";
import { withParams } from "@/lib/list-controls";

const BASE_PATH = "/dashboard/safety/legal-register";

type EntryRow = {
  id: string;
  title: string;
  jurisdiction: string | null;
  category: string;
  status: string;
  next_review_date: string | null;
  owner: string | null;
};

export default async function LegalRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireProfile();

  const status = LEGAL_STATUSES.some((s) => s.value === sp.status) ? sp.status : undefined;

  let query = supabase
    .from("legal_register_entries")
    .select("id, title, jurisdiction, category, status, next_review_date, owner")
    .order("next_review_date", { ascending: true, nullsFirst: false });

  if (status) query = query.eq("status", status);

  const { data: entries } = await query.returns<EntryRow[]>();
  const rows = entries ?? [];

  const { data: allEntries } = await supabase.from("legal_register_entries").select("status, next_review_date");
  const allRows = allEntries ?? [];
  const nonCompliantCount = allRows.filter((r) => r.status === "non_compliant").length;
  const dueForReviewCount = allRows.filter((r) => dateStatus(r.next_review_date).label === "Expiring soon").length;

  const ownerIds = Array.from(new Set(rows.map((r) => r.owner).filter((v): v is string => Boolean(v))));
  const { data: profiles } = ownerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ownerIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Someone"]));

  const statusFilters = [{ value: undefined, label: "All" }, ...LEGAL_STATUSES];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Legal & Regulatory Register</h1>
          <p className="mt-1 text-sm text-muted">
            Applicable OH&amp;S regulations mapped to internal controls — clause 6.1.3 / 9.1.2.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`${BASE_PATH}/export${withParams(sp, {})}`} className="btn-secondary">
            Export CSV
          </Link>
          <Link href={`${BASE_PATH}/new`} className="btn-primary">
            New entry
          </Link>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="surface p-4">
          <dt className="text-xs text-faint">Entries on file</dt>
          <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{allRows.length}</dd>
        </div>
        <div className="surface p-4">
          <dt className="text-xs text-faint">Non-compliant</dt>
          <dd
            className="mt-1 text-xl font-semibold"
            style={{ color: nonCompliantCount ? "var(--danger)" : "var(--text-primary)" }}
          >
            {nonCompliantCount}
          </dd>
        </div>
        <div className="surface p-4">
          <dt className="text-xs text-faint">Due for review soon</dt>
          <dd
            className="mt-1 text-xl font-semibold"
            style={{ color: dueForReviewCount ? "var(--warning)" : "var(--text-primary)" }}
          >
            {dueForReviewCount}
          </dd>
        </div>
      </dl>

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
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {status ? "Nothing matches this filter." : "Nothing logged yet. Click “New entry” to add the first one."}
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Jurisdiction
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Owner
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Next review
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => {
                const review = dateStatus(entry.next_review_date, { noDateLabel: "No review date" });
                return (
                  <tr key={entry.id} className="list-row">
                    <td className="px-4 py-3">
                      <Link href={`${BASE_PATH}/${entry.id}`} className="link-brand row-link">
                        {entry.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{legalCategoryLabel(entry.category)}</td>
                    <td className="px-4 py-3 text-muted">{entry.jurisdiction || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={legalStatusLabel(entry.status)} tone={legalStatusTone(entry.status)} />
                    </td>
                    <td className="px-4 py-3 text-muted">{entry.owner ? nameById.get(entry.owner) : "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={review.label} tone={review.tone} />
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
