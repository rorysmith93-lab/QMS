import { requireProfile } from "@/lib/current-profile";
import { CHANGE_STATUSES, changeStatusLabel, changeStatusTone } from "@/lib/change-control";
import { ncStatusLabel } from "@/lib/non-conformances";
import { StatusBadge } from "@/components/status-badge";
import { ChangeRequestForm } from "@/components/change-control/change-request-form";
import { UpdateChangeRequestForm } from "@/components/change-control/update-change-request-form";
import type { LinkableItem } from "@/components/change-control/change-links-picker";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";
import Link from "next/link";

type ChangeRequestRow = {
  id: string;
  title: string;
  description: string | null;
  impact_assessment: string | null;
  status: string;
  owner: string | null;
  target_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  implemented_at: string | null;
};

export default async function ChangeControlPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { error, status: statusFilter } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "changeControl")) {
    return <AccessDenied />;
  }

  const validStatus = CHANGE_STATUSES.some((s) => s.value === statusFilter) ? statusFilter : undefined;

  let query = supabase
    .from("change_requests")
    .select(
      "id, title, description, impact_assessment, status, owner, target_date, approved_by, approved_at, implemented_at"
    );
  if (validStatus) query = query.eq("status", validStatus);

  const [
    { data: changeRequests },
    { data: members },
    { data: documents },
    { data: sops },
    { data: workInstructions },
    { data: ncrs },
    { data: linkedDocs },
    { data: linkedSops },
    { data: linkedWis },
    { data: linkedNcrs },
  ] = await Promise.all([
    query.order("created_at", { ascending: false }).returns<ChangeRequestRow[]>(),
    supabase.from("profiles").select("id, full_name, email").eq("company_id", profile.company_id).order("full_name"),
    supabase.from("documents").select("id, title, document_number").order("title"),
    supabase.from("sops").select("id, title, document_number").order("title"),
    supabase.from("work_instructions").select("id, title, document_number").order("title"),
    supabase.from("non_conformances").select("id, title, status").order("created_at", { ascending: false }),
    supabase.from("change_request_documents").select("change_request_id, document_id"),
    supabase.from("change_request_sops").select("change_request_id, sop_id"),
    supabase.from("change_request_work_instructions").select("change_request_id, work_instruction_id"),
    supabase.from("change_request_ncrs").select("change_request_id, non_conformance_id"),
  ]);

  const memberList = members ?? [];
  const nameById = new Map(memberList.map((m) => [m.id, m.full_name || m.email]));

  const documentItems: LinkableItem[] = (documents ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    documentNumber: d.document_number,
  }));
  const sopItems: LinkableItem[] = (sops ?? []).map((s) => ({ id: s.id, title: s.title, documentNumber: s.document_number }));
  const wiItems: LinkableItem[] = (workInstructions ?? []).map((w) => ({
    id: w.id,
    title: w.title,
    documentNumber: w.document_number,
  }));
  const ncrItems: LinkableItem[] = (ncrs ?? []).map((n) => ({ id: n.id, title: `${n.title} (${ncStatusLabel(n.status)})` }));

  const documentTitleById = new Map(documentItems.map((d) => [d.id, d.documentNumber ? `${d.documentNumber} — ${d.title}` : d.title]));
  const sopTitleById = new Map(sopItems.map((s) => [s.id, s.documentNumber ? `${s.documentNumber} — ${s.title}` : s.title]));
  const wiTitleById = new Map(wiItems.map((w) => [w.id, w.documentNumber ? `${w.documentNumber} — ${w.title}` : w.title]));
  const ncrTitleById = new Map(ncrItems.map((n) => [n.id, n.title]));

  function groupBy<T extends Record<string, unknown>>(rows: T[] | null, key: keyof T, value: keyof T) {
    const map = new Map<string, string[]>();
    for (const row of rows ?? []) {
      const crId = String(row[key]);
      const list = map.get(crId) ?? [];
      list.push(String(row[value]));
      map.set(crId, list);
    }
    return map;
  }

  const docLinksByRequest = groupBy(linkedDocs, "change_request_id", "document_id");
  const sopLinksByRequest = groupBy(linkedSops, "change_request_id", "sop_id");
  const wiLinksByRequest = groupBy(linkedWis, "change_request_id", "work_instruction_id");
  const ncrLinksByRequest = groupBy(linkedNcrs, "change_request_id", "non_conformance_id");

  const today = new Date().toISOString().slice(0, 10);
  const awaitingDecisionCount = (changeRequests ?? []).filter((c) => c.status === "proposed").length;
  const overdueCount = (changeRequests ?? []).filter(
    (c) => c.target_date && c.target_date < today && (c.status === "proposed" || c.status === "approved")
  ).length;

  const statusFilters = [{ value: undefined, label: "All" }, ...CHANGE_STATUSES];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Change Control</h1>
          <p className="mt-1 text-sm text-muted">
            Planning changes to the QMS — clause 6.3. Raise a change, assess its impact, and link exactly which
            documents, SOPs, work instructions, or NCRs it relates to.
          </p>
        </div>
        <ChangeRequestForm members={memberList} documents={documentItems} sops={sopItems} workInstructions={wiItems} ncrs={ncrItems} />
      </div>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="surface p-4">
          <p className="text-xs text-faint">Awaiting decision</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{awaitingDecisionCount}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-faint">Past target date, not yet implemented</p>
          <p
            className="mt-1 text-2xl font-semibold"
            style={{ color: overdueCount > 0 ? "var(--danger)" : "var(--text-primary)" }}
          >
            {overdueCount}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {statusFilters.map((f) => {
          const active = (f.value ?? "") === (validStatus ?? "");
          return (
            <Link
              key={f.label}
              href={f.value ? `/dashboard/change-control?status=${f.value}` : "/dashboard/change-control"}
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
        {!changeRequests || changeRequests.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            {validStatus
              ? "Nothing matches this filter."
              : "Nothing raised yet. Click “Raise change request” to log the first one."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Change
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Owner
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Target date
                  </th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {changeRequests.map((cr) => {
                  const overdue = cr.target_date && cr.target_date < today && (cr.status === "proposed" || cr.status === "approved");
                  const linkedDocIds = docLinksByRequest.get(cr.id) ?? [];
                  const linkedSopIds = sopLinksByRequest.get(cr.id) ?? [];
                  const linkedWiIds = wiLinksByRequest.get(cr.id) ?? [];
                  const linkedNcrIds = ncrLinksByRequest.get(cr.id) ?? [];

                  const affectedTitles = [
                    ...linkedDocIds.map((id) => documentTitleById.get(id)),
                    ...linkedSopIds.map((id) => sopTitleById.get(id)),
                    ...linkedWiIds.map((id) => wiTitleById.get(id)),
                  ].filter(Boolean) as string[];
                  const triggerTitles = linkedNcrIds.map((id) => ncrTitleById.get(id)).filter(Boolean) as string[];

                  return (
                    <tr key={cr.id} className="list-row">
                      <td className="px-4 py-3">
                        <p className="text-[var(--text-primary)]">{cr.title}</p>
                        {cr.description && <p className="mt-0.5 text-xs text-faint">{cr.description}</p>}
                        {affectedTitles.length > 0 && (
                          <p className="mt-1 text-xs text-muted">Affects: {affectedTitles.join(", ")}</p>
                        )}
                        {triggerTitles.length > 0 && (
                          <p className="mt-0.5 text-xs text-muted">Triggered by: {triggerTitles.join(", ")}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={changeStatusLabel(cr.status)} tone={changeStatusTone(cr.status)} />
                      </td>
                      <td className="px-4 py-3 text-muted">{cr.owner ? nameById.get(cr.owner) ?? "Unknown" : "Unassigned"}</td>
                      <td className="px-4 py-3 text-muted">
                        {cr.target_date ? (
                          <span style={{ color: overdue ? "var(--danger-text)" : undefined }}>
                            {new Date(cr.target_date).toLocaleDateString()}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UpdateChangeRequestForm
                          changeRequest={cr}
                          members={memberList}
                          documents={documentItems}
                          sops={sopItems}
                          workInstructions={wiItems}
                          ncrs={ncrItems}
                          linkedDocumentIds={linkedDocIds}
                          linkedSopIds={linkedSopIds}
                          linkedWorkInstructionIds={linkedWiIds}
                          linkedNcrIds={linkedNcrIds}
                        />
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
