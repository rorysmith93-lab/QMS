import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { createSafetyIncident } from "@/app/dashboard/safety/incidents/actions";
import { INCIDENT_SEVERITIES, INCIDENT_TYPES } from "@/lib/safety-incidents";
import { IncidentPhotosField } from "@/components/incident-photos-field";
import { UseMyLocationButton } from "@/components/use-my-location-button";

export default async function NewSafetyIncidentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("company_id", profile.company_id)
    .order("full_name");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/safety/incidents" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to incidents
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">Report an incident</h1>
      <p className="mt-1 text-sm text-muted">
        An incident number is assigned automatically. This form works fine from a phone browser —
        attach photos and tap &ldquo;Use my location&rdquo; from the scene.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createSafetyIncident} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Slip near loading bay"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[var(--text-primary)]">
            What happened?
          </label>
          <textarea id="description" name="description" required rows={4} className="field mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-[var(--text-primary)]">
              Type
            </label>
            <select id="type" name="type" defaultValue="near_miss" className="field mt-1">
              {INCIDENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-[var(--text-primary)]">
              Severity
            </label>
            <select id="severity" name="severity" defaultValue="low" className="field mt-1">
              {INCIDENT_SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dateOccurred" className="block text-sm font-medium text-[var(--text-primary)]">
              Date occurred
            </label>
            <input id="dateOccurred" name="dateOccurred" type="date" defaultValue={today} className="field mt-1" />
          </div>
          <div>
            <label htmlFor="dateReported" className="block text-sm font-medium text-[var(--text-primary)]">
              Date reported
            </label>
            <input id="dateReported" name="dateReported" type="date" defaultValue={today} className="field mt-1" />
          </div>
        </div>

        <div>
          <label htmlFor="locationText" className="block text-sm font-medium text-[var(--text-primary)]">
            Location
          </label>
          <input id="locationText" name="locationText" type="text" placeholder="e.g. Loading bay 3" className="field mt-1" />
          <div className="mt-2">
            <UseMyLocationButton />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-[var(--text-primary)]">
              Department
            </label>
            <input id="department" name="department" type="text" className="field mt-1" />
          </div>
          <div>
            <label htmlFor="injuredPersonName" className="block text-sm font-medium text-[var(--text-primary)]">
              Injured person <span className="text-faint">(if any)</span>
            </label>
            <input id="injuredPersonName" name="injuredPersonName" type="text" className="field mt-1" />
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

        <IncidentPhotosField name="photos" label="Photos" />

        <button type="submit" className="btn-primary w-full">
          Report incident
        </button>
      </form>
    </div>
  );
}
