import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { createNonConformance } from "@/app/dashboard/non-conformances/actions";
import { NC_SOURCES } from "@/lib/non-conformances";

export default async function NewNonConformancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const [{ data: members }, { data: documents }, { data: suppliers }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", profile.company_id)
      .order("full_name"),
    supabase
      .from("documents")
      .select("id, title")
      .eq("company_id", profile.company_id)
      .order("title"),
    supabase.from("suppliers").select("id, name").order("name"),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/non-conformances"
        className="text-sm text-muted hover:text-[var(--text-primary)]"
      >
        ← Back to non-conformances
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">Log a non-conformance</h1>
      <p className="mt-1 text-sm text-muted">
        This captures the initial report. An NCR number is assigned automatically — containment,
        disposition, CAPA, root cause, and closure are filled in on the next screen as the
        investigation progresses.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createNonConformance} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Wrong material used on batch #482"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)]">
            Description of Non-Conformance
          </label>
          <textarea id="description" name="description" required rows={4} className="field mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dateReported" className="block text-sm font-medium text-[var(--text-primary)]">
              Date Reported
            </label>
            <input
              id="dateReported"
              name="dateReported"
              type="date"
              defaultValue={today}
              className="field mt-1"
            />
          </div>
          <div>
            <label htmlFor="reportedBy" className="block text-sm font-medium text-[var(--text-primary)]">
              Reported By
            </label>
            <input
              id="reportedBy"
              name="reportedBy"
              type="text"
              defaultValue={profile.full_name ?? ""}
              className="field mt-1"
            />
          </div>
        </div>

        <div>
          <label htmlFor="source" className="block text-sm font-medium text-[var(--text-primary)]">
            Source of Defect
          </label>
          <select id="source" name="source" defaultValue="internal_process" className="field mt-1">
            {NC_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="supplierId" className="block text-sm font-medium text-[var(--text-primary)]">
            Supplier <span className="text-faint">(optional — for a supplier-caused issue)</span>
          </label>
          <select id="supplierId" name="supplierId" defaultValue="" className="field mt-1">
            <option value="">— None —</option>
            {(suppliers ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-[var(--text-primary)]">
              Department / Location
            </label>
            <input id="department" name="department" type="text" className="field mt-1" />
          </div>
          <div>
            <label htmlFor="itemOrProcess" className="block text-sm font-medium text-[var(--text-primary)]">
              Item / Process Name
            </label>
            <input id="itemOrProcess" name="itemOrProcess" type="text" className="field mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lotOrSerial" className="block text-sm font-medium text-[var(--text-primary)]">
              ID / Lot / Serial Number
            </label>
            <input id="lotOrSerial" name="lotOrSerial" type="text" className="field mt-1" />
          </div>
          <div>
            <label
              htmlFor="quantityAffected"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Quantity Affected
            </label>
            <input
              id="quantityAffected"
              name="quantityAffected"
              type="number"
              min={0}
              step={1}
              className="field mt-1"
            />
          </div>
        </div>

        <div>
          <label htmlFor="assignedTo" className="block text-sm font-medium text-[var(--text-primary)]">
            Assign to <span className="text-faint">(optional)</span>
          </label>
          <select id="assignedTo" name="assignedTo" defaultValue="" className="field mt-1">
            <option value="">Unassigned</option>
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-[var(--text-primary)]">
            Due date <span className="text-faint">(optional)</span>
          </label>
          <input id="dueDate" name="dueDate" type="date" className="field mt-1" />
        </div>

        {(documents ?? []).length > 0 && (
          <div>
            <label
              htmlFor="relatedDocumentId"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Related document <span className="text-faint">(optional)</span>
            </label>
            <select
              id="relatedDocumentId"
              name="relatedDocumentId"
              defaultValue=""
              className="field mt-1"
            >
              <option value="">None</option>
              {(documents ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="btn-primary w-full">
          Log non-conformance
        </button>
      </form>
    </div>
  );
}
