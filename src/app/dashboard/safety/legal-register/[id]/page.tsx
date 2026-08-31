import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import { logComplianceCheck, updateLegalRegisterEntry } from "@/app/dashboard/safety/legal-register/actions";
import { legalCategoryLabel, LEGAL_STATUSES, legalStatusLabel, legalStatusTone } from "@/lib/legal-register";
import { dateStatus } from "@/lib/dates";
import { StatusBadge } from "@/components/status-badge";

type EntryRow = {
  id: string;
  title: string;
  jurisdiction: string | null;
  regulator: string | null;
  reference_number: string | null;
  description: string | null;
  category: string;
  status: string;
  owner: string | null;
  last_reviewed_date: string | null;
  next_review_date: string | null;
  notes: string | null;
};

type CheckRow = {
  id: string;
  title: string;
  checklist: { item: string; result: string; notes: string }[];
  overall_result: string;
  performed_by: string | null;
  performed_date: string;
};

export default async function LegalRegisterEntryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const { data: entry } = await supabase
    .from("legal_register_entries")
    .select(
      "id, title, jurisdiction, regulator, reference_number, description, category, status, owner, last_reviewed_date, next_review_date, notes"
    )
    .eq("id", id)
    .single<EntryRow>();

  if (!entry) {
    notFound();
  }

  const [{ data: members }, { data: checks }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("company_id", profile.company_id).order("full_name"),
    supabase
      .from("legal_compliance_checks")
      .select("id, title, checklist, overall_result, performed_by, performed_date")
      .eq("legal_register_entry_id", entry.id)
      .order("performed_date", { ascending: false })
      .returns<CheckRow[]>(),
  ]);

  const nameById = new Map((members ?? []).map((m) => [m.id, m.full_name || m.email]));

  const boundUpdate = updateLegalRegisterEntry.bind(null, entry.id);
  const boundLogCheck = logComplianceCheck.bind(null, entry.id);

  const review = dateStatus(entry.next_review_date, { noDateLabel: "No review date set" });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/safety/legal-register" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to legal register
      </Link>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{entry.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {legalCategoryLabel(entry.category)}
            {entry.jurisdiction ? ` · ${entry.jurisdiction}` : ""}
            {entry.regulator ? ` · ${entry.regulator}` : ""}
            {entry.reference_number ? ` · ${entry.reference_number}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={legalStatusLabel(entry.status)} tone={legalStatusTone(entry.status)} />
          <StatusBadge label={review.label} tone={review.tone} />
        </div>
      </div>

      {entry.description && <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{entry.description}</p>}

      <form action={boundUpdate} className="surface mt-6 space-y-4 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">Status &amp; Review</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)]">
              Status
            </label>
            <select id="status" name="status" defaultValue={entry.status} className="field mt-1">
              {LEGAL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-[var(--text-primary)]">
              Owner
            </label>
            <select id="owner" name="owner" defaultValue={entry.owner ?? ""} className="field mt-1">
              <option value="">Unassigned</option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lastReviewedDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Last reviewed
            </label>
            <input
              id="lastReviewedDate"
              name="lastReviewedDate"
              type="date"
              defaultValue={entry.last_reviewed_date ?? ""}
              className="field mt-1"
            />
          </div>
          <div>
            <label htmlFor="nextReviewDate" className="block text-sm font-medium text-[var(--text-primary)]">
              Next review due
            </label>
            <input
              id="nextReviewDate"
              name="nextReviewDate"
              type="date"
              defaultValue={entry.next_review_date ?? ""}
              className="field mt-1"
            />
          </div>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-primary)]">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={3} defaultValue={entry.notes ?? ""} className="field mt-1" />
        </div>
        <button type="submit" className="btn-primary w-full">
          Save
        </button>
      </form>

      <div className="surface mt-6 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">Compliance checks</h2>
        <p className="mt-1 text-xs text-faint">Clause 9.1.2 — periodic evaluation of compliance with this requirement.</p>

        {(checks ?? []).length > 0 && (
          <div className="mt-4 space-y-3">
            {(checks ?? []).map((check) => (
              <div key={check.id} className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{check.title}</p>
                  <StatusBadge
                    label={check.overall_result === "pass" ? "Pass" : "Fail"}
                    tone={check.overall_result === "pass" ? "positive" : "critical"}
                  />
                </div>
                <p className="text-xs text-faint">
                  {check.performed_by ? nameById.get(check.performed_by) : "Someone"} ·{" "}
                  {new Date(check.performed_date).toLocaleDateString()}
                </p>
                {check.checklist.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-sm text-muted">
                    {check.checklist.map((item, i) => (
                      <li key={i}>{item.item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        <form action={boundLogCheck} className="mt-6 space-y-3 border-t pt-6" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Log a new check</h3>
          <div>
            <label htmlFor="checkTitle" className="block text-sm font-medium text-[var(--text-primary)]">
              Title
            </label>
            <input id="checkTitle" name="title" type="text" required placeholder="e.g. Q3 compliance sweep" className="field mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="performedDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Date performed
              </label>
              <input id="performedDate" name="performedDate" type="date" defaultValue={today} className="field mt-1" />
            </div>
            <div>
              <label htmlFor="overallResult" className="block text-sm font-medium text-[var(--text-primary)]">
                Overall result
              </label>
              <select id="overallResult" name="overallResult" defaultValue="pass" className="field mt-1">
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="checklistItems" className="block text-sm font-medium text-[var(--text-primary)]">
              Checklist items <span className="text-faint">(one per line)</span>
            </label>
            <textarea
              id="checklistItems"
              name="checklistItems"
              rows={4}
              placeholder={"e.g.\nPermits current\nRecords on file\nTraining up to date"}
              className="field mt-1"
            />
          </div>
          <button type="submit" className="btn-secondary w-full">
            Log check
          </button>
        </form>
      </div>
    </div>
  );
}
