import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import { updateNonConformance } from "@/app/dashboard/non-conformances/actions";
import {
  DISPOSITION_OPTIONS,
  NC_STATUSES,
  ncStatusLabel,
  ncStatusTone,
  REINSPECTION_OUTCOMES,
  ROOT_CAUSE_CATEGORIES,
  sourceLabel,
} from "@/lib/non-conformances";
import { StatusBadge } from "@/components/status-badge";
import { FiveWhysTool } from "@/components/root-cause/five-whys-tool";
import { FishboneTool } from "@/components/root-cause/fishbone-tool";
import { EightDTool } from "@/components/root-cause/eight-d-tool";
import { saveFishbone, saveFiveWhys } from "@/app/dashboard/non-conformances/root-cause-actions";
import { FishboneDiagramExpandable } from "@/components/root-cause/fishbone-diagram-expandable";
import type { EightDData, FishboneData, FiveWhysData } from "@/lib/root-cause-tools";
import { EIGHT_D_SECTIONS } from "@/lib/root-cause-tools";

type NcRow = {
  id: string;
  ncr_number: string;
  title: string;
  description: string;
  source: string;
  status: string;
  date_reported: string;
  reported_by: string | null;
  department: string | null;
  item_or_process: string | null;
  lot_or_serial: string | null;
  quantity_affected: number | null;
  assigned_to: string | null;
  due_date: string | null;
  containment_action: string | null;
  containment_responsible: string | null;
  containment_date: string | null;
  disposition: string | null;
  disposition_details: string | null;
  qm_approval_name: string | null;
  qm_approval_date: string | null;
  eng_approval_name: string | null;
  eng_approval_date: string | null;
  capa_required: boolean;
  capa_tracking_number: string | null;
  root_cause_category: string | null;
  root_cause: string | null;
  verification_notes: string | null;
  reinspection_outcome: string | null;
  qa_inspector_name: string | null;
  qa_inspector_date: string | null;
  related_document_id: string | null;
  supplier_id: string | null;
  created_by: string | null;
  created_at: string;
  closed_at: string | null;
};

export default async function NonConformanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const { data: nc } = await supabase
    .from("non_conformances")
    .select(
      "id, ncr_number, title, description, source, status, date_reported, reported_by, department, item_or_process, lot_or_serial, quantity_affected, assigned_to, due_date, containment_action, containment_responsible, containment_date, disposition, disposition_details, qm_approval_name, qm_approval_date, eng_approval_name, eng_approval_date, capa_required, capa_tracking_number, root_cause_category, root_cause, verification_notes, reinspection_outcome, qa_inspector_name, qa_inspector_date, related_document_id, supplier_id, created_by, created_at, closed_at"
    )
    .eq("id", id)
    .single<NcRow>();

  if (!nc) {
    notFound();
  }

  const [{ data: members }, relatedDocument, linkedSupplier, creator] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", profile.company_id)
      .order("full_name"),
    nc.related_document_id
      ? supabase
          .from("documents")
          .select("id, title")
          .eq("id", nc.related_document_id)
          .single()
          .then((r) => r.data)
      : Promise.resolve(null),
    nc.supplier_id
      ? supabase
          .from("suppliers")
          .select("id, name")
          .eq("id", nc.supplier_id)
          .single()
          .then((r) => r.data)
      : Promise.resolve(null),
    nc.created_by
      ? supabase
          .from("profiles")
          .select("full_name")
          .eq("id", nc.created_by)
          .single()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  const { data: analyses } = await supabase
    .from("root_cause_analyses")
    .select("type, data")
    .eq("non_conformance_id", nc.id)
    .returns<{ type: "five_whys" | "fishbone" | "eight_d"; data: Record<string, unknown> }[]>();

  const fiveWhysData = (analyses?.find((a) => a.type === "five_whys")?.data ?? null) as
    | FiveWhysData
    | null;
  const fishboneData = (analyses?.find((a) => a.type === "fishbone")?.data ?? null) as
    | FishboneData
    | null;
  const eightDData = (analyses?.find((a) => a.type === "eight_d")?.data ?? null) as
    | EightDData
    | null;

  const boundUpdate = updateNonConformance.bind(null, nc.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/non-conformances"
        className="text-sm text-muted hover:text-[var(--text-primary)]"
      >
        ← Back to non-conformances
      </Link>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-faint">{nc.ncr_number}</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{nc.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {sourceLabel(nc.source)} · Logged by {creator?.full_name || "someone"} on{" "}
            {new Date(nc.created_at).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge label={ncStatusLabel(nc.status)} tone={ncStatusTone(nc.status)} />
      </div>

      {/* Report details — captured up front, read-only here. */}
      <div className="surface mt-6 p-6">
        <h2 className="text-sm font-semibold text-faint">Report Details</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
          {nc.description}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Date Reported</dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">
              {new Date(nc.date_reported).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Reported By</dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">{nc.reported_by || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">
              Department / Location
            </dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">{nc.department || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">
              Item / Process Name
            </dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">{nc.item_or_process || "—"}</dd>
          </div>
          {linkedSupplier && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-faint">Supplier</dt>
              <dd className="mt-0.5 text-sm">
                <Link href="/dashboard/suppliers" className="link-brand">
                  {linkedSupplier.name}
                </Link>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">
              ID / Lot / Serial
            </dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">{nc.lot_or_serial || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">
              Quantity Affected
            </dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">
              {nc.quantity_affected ?? "—"}
            </dd>
          </div>
        </dl>
        {relatedDocument && (
          <p className="mt-4 text-sm text-muted">
            Related document:{" "}
            <Link href={`/dashboard/documents/${relatedDocument.id}`} className="link-brand">
              {relatedDocument.title}
            </Link>
          </p>
        )}
      </div>

      <form action={boundUpdate} className="mt-6 space-y-6">
        {/* Status / ownership */}
        <div className="surface space-y-4 p-6">
          <h2 className="font-semibold text-[var(--text-primary)]">Status &amp; Ownership</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)]">
                Status
              </label>
              <select id="status" name="status" defaultValue={nc.status} className="field mt-1">
                {NC_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-[var(--text-primary)]">
                Assigned to
              </label>
              <select
                id="assignedTo"
                name="assignedTo"
                defaultValue={nc.assigned_to ?? ""}
                className="field mt-1"
              >
                <option value="">Unassigned</option>
                {(members ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Due date
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={nc.due_date ?? ""}
              className="field mt-1"
            />
          </div>
          {nc.closed_at && (
            <p className="text-xs text-faint">
              NCR Closure Date: {new Date(nc.closed_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Containment */}
        <div className="surface space-y-4 p-6">
          <h2 className="font-semibold text-[var(--text-primary)]">Containment</h2>
          <div>
            <label
              htmlFor="containmentAction"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Containment Action Details
            </label>
            <textarea
              id="containmentAction"
              name="containmentAction"
              rows={3}
              defaultValue={nc.containment_action ?? ""}
              placeholder="What was done immediately to stop the problem spreading?"
              className="field mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="containmentResponsible"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Responsibility
              </label>
              <input
                id="containmentResponsible"
                name="containmentResponsible"
                type="text"
                defaultValue={nc.containment_responsible ?? ""}
                className="field mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="containmentDate"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Date
              </label>
              <input
                id="containmentDate"
                name="containmentDate"
                type="date"
                defaultValue={nc.containment_date ?? ""}
                className="field mt-1"
              />
            </div>
          </div>
        </div>

        {/* Disposition */}
        <div className="surface space-y-4 p-6">
          <h2 className="font-semibold text-[var(--text-primary)]">Disposition</h2>
          <div>
            <label htmlFor="disposition" className="block text-sm font-medium text-[var(--text-primary)]">
              Disposition Selection
            </label>
            <select
              id="disposition"
              name="disposition"
              defaultValue={nc.disposition ?? ""}
              className="field mt-1"
            >
              <option value="">Not yet decided</option>
              {DISPOSITION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="dispositionDetails"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Disposition Details / Work Instructions
            </label>
            <textarea
              id="dispositionDetails"
              name="dispositionDetails"
              rows={3}
              defaultValue={nc.disposition_details ?? ""}
              className="field mt-1"
            />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-faint">
            Disposition Approvals
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="qmApprovalName"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Quality Manager
              </label>
              <input
                id="qmApprovalName"
                name="qmApprovalName"
                type="text"
                placeholder="Name / signature"
                defaultValue={nc.qm_approval_name ?? ""}
                className="field mt-1"
              />
              <input
                id="qmApprovalDate"
                name="qmApprovalDate"
                type="date"
                defaultValue={nc.qm_approval_date ?? ""}
                className="field mt-2"
              />
            </div>
            <div>
              <label
                htmlFor="engApprovalName"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Engineering / Ops
              </label>
              <input
                id="engApprovalName"
                name="engApprovalName"
                type="text"
                placeholder="Name / signature"
                defaultValue={nc.eng_approval_name ?? ""}
                className="field mt-1"
              />
              <input
                id="engApprovalDate"
                name="engApprovalDate"
                type="date"
                defaultValue={nc.eng_approval_date ?? ""}
                className="field mt-2"
              />
            </div>
          </div>
        </div>

        {/* CAPA */}
        <div className="surface space-y-4 p-6">
          <h2 className="font-semibold text-[var(--text-primary)]">CAPA</h2>
          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              name="capaRequired"
              defaultChecked={nc.capa_required}
              className="rounded"
              style={{ borderColor: "var(--border-strong)" }}
            />
            Is CAPA Required?
          </label>
          <div>
            <label
              htmlFor="capaTrackingNumber"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              CAPA Tracking Number
            </label>
            <input
              id="capaTrackingNumber"
              name="capaTrackingNumber"
              type="text"
              defaultValue={nc.capa_tracking_number ?? ""}
              className="field mt-1"
            />
          </div>
        </div>

        {/* Root cause */}
        <div className="surface space-y-4 p-6">
          <h2 className="font-semibold text-[var(--text-primary)]">Root Cause</h2>
          <div>
            <label
              htmlFor="rootCauseCategory"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Root Cause Category
            </label>
            <select
              id="rootCauseCategory"
              name="rootCauseCategory"
              defaultValue={nc.root_cause_category ?? ""}
              className="field mt-1"
            >
              <option value="">Not yet determined</option>
              {ROOT_CAUSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rootCause" className="block text-sm font-medium text-[var(--text-primary)]">
              Root Cause Description
            </label>
            <textarea
              id="rootCause"
              name="rootCause"
              rows={3}
              defaultValue={nc.root_cause ?? ""}
              placeholder="Why did this actually happen?"
              className="field mt-1"
            />
          </div>
        </div>

        {/* Verification & closure */}
        <div className="surface space-y-4 p-6">
          <h2 className="font-semibold text-[var(--text-primary)]">Verification &amp; Closure</h2>
          <div>
            <label
              htmlFor="verificationNotes"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Verification Notes
            </label>
            <textarea
              id="verificationNotes"
              name="verificationNotes"
              rows={3}
              defaultValue={nc.verification_notes ?? ""}
              className="field mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="reinspectionOutcome"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Re-Inspection Outcome
            </label>
            <select
              id="reinspectionOutcome"
              name="reinspectionOutcome"
              defaultValue={nc.reinspection_outcome ?? ""}
              className="field mt-1"
            >
              <option value="">Not yet inspected</option>
              {REINSPECTION_OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="qaInspectorName"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                QA Inspector
              </label>
              <input
                id="qaInspectorName"
                name="qaInspectorName"
                type="text"
                placeholder="Name / signature"
                defaultValue={nc.qa_inspector_name ?? ""}
                className="field mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="qaInspectorDate"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Date
              </label>
              <input
                id="qaInspectorDate"
                name="qaInspectorDate"
                type="date"
                defaultValue={nc.qa_inspector_date ?? ""}
                className="field mt-1"
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">
          Save
        </button>
      </form>

      {/* Root cause analysis tools — each pops out its own editor and
          saves itself independently of the form above. */}
      <div className="surface mt-6 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">Root Cause Analysis Tools</h2>
        <p className="mt-1 text-xs text-faint">
          Optional aids for working through why this happened — save one and its summary shows up
          here.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <FiveWhysTool subjectId={nc.id} initialData={fiveWhysData} saveAction={saveFiveWhys} />
          <FishboneTool subjectId={nc.id} initialData={fishboneData} saveAction={saveFishbone} />
          <EightDTool ncId={nc.id} initialData={eightDData} />
        </div>

        {fiveWhysData && (fiveWhysData.problem || fiveWhysData.whys.some(Boolean)) && (
          <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">5 Whys</h3>
            {fiveWhysData.problem && (
              <p className="mt-2 text-sm text-muted">
                <span className="font-medium text-[var(--text-primary)]">Problem:</span>{" "}
                {fiveWhysData.problem}
              </p>
            )}
            <ol className="mt-2 space-y-1 text-sm text-muted">
              {fiveWhysData.whys.map((why, i) =>
                why ? (
                  <li key={i}>
                    <span className="font-medium text-[var(--text-primary)]">Why {i + 1}:</span> {why}
                  </li>
                ) : null
              )}
            </ol>
          </div>
        )}

        {fishboneData && (fishboneData.problem || Object.values(fishboneData).some((v) => Array.isArray(v) && v.length)) && (
          <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Fishbone Diagram</h3>
            {fishboneData.problem && (
              <p className="mt-2 text-sm text-muted">
                <span className="font-medium text-[var(--text-primary)]">Problem / Effect:</span>{" "}
                {fishboneData.problem}
              </p>
            )}
            <div className="mt-3 overflow-x-auto">
              <FishboneDiagramExpandable data={fishboneData} />
            </div>
          </div>
        )}

        {eightDData && Object.values(eightDData).some(Boolean) && (
          <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">8D Report</h3>
            <p className="mt-1 text-xs text-faint">
              {EIGHT_D_SECTIONS.filter((s) => eightDData[s.key]).length} of {EIGHT_D_SECTIONS.length}{" "}
              sections completed
            </p>
            <dl className="mt-2 space-y-2">
              {EIGHT_D_SECTIONS.filter((s) => eightDData[s.key]).map((s) => (
                <div key={s.key}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-faint">{s.label}</dt>
                  <dd className="text-sm text-muted">{eightDData[s.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
