import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import { addSafetyIncidentPhotos, updateSafetyIncident } from "@/app/dashboard/safety/incidents/actions";
import { createCapaAction, updateCapaAction } from "@/app/dashboard/safety/incidents/capa-actions";
import { saveIncidentFishbone, saveIncidentFiveWhys } from "@/app/dashboard/safety/incidents/root-cause-actions";
import {
  incidentSeverityLabel,
  incidentSeverityTone,
  incidentStatusLabel,
  incidentStatusTone,
  incidentTypeLabel,
  INCIDENT_STATUSES,
  isIncidentOverdue,
} from "@/lib/safety-incidents";
import { capaStatusLabel, capaStatusTone, CAPA_STATUSES, isCapaOverdue } from "@/lib/capa";
import { StatusBadge } from "@/components/status-badge";
import { FiveWhysTool } from "@/components/root-cause/five-whys-tool";
import { FishboneTool } from "@/components/root-cause/fishbone-tool";
import { FishboneDiagramExpandable } from "@/components/root-cause/fishbone-diagram-expandable";
import type { FishboneData, FiveWhysData } from "@/lib/root-cause-tools";
import { IncidentPhotosField } from "@/components/incident-photos-field";

type IncidentRow = {
  id: string;
  incident_number: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  date_occurred: string;
  date_reported: string;
  reported_by: string | null;
  injured_person_name: string | null;
  department: string | null;
  assigned_to: string | null;
  due_date: string | null;
  root_cause: string | null;
  created_at: string;
  closed_at: string | null;
};

type PhotoRow = { id: string; file_path: string; file_name: string };
type CapaRow = {
  id: string;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  completed_at: string | null;
  proof_file_path: string | null;
  proof_file_name: string | null;
};

export default async function SafetyIncidentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const { data: incident } = await supabase
    .from("safety_incidents")
    .select(
      "id, incident_number, type, severity, status, title, description, location_text, latitude, longitude, date_occurred, date_reported, reported_by, injured_person_name, department, assigned_to, due_date, root_cause, created_at, closed_at"
    )
    .eq("id", id)
    .single<IncidentRow>();

  if (!incident) {
    notFound();
  }

  const [{ data: members }, { data: photos }, { data: capaActions }, { data: analyses }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("company_id", profile.company_id).order("full_name"),
    supabase
      .from("safety_incident_photos")
      .select("id, file_path, file_name")
      .eq("incident_id", incident.id)
      .returns<PhotoRow[]>(),
    supabase
      .from("capa_actions")
      .select("id, description, assigned_to, due_date, status, completed_at, proof_file_path, proof_file_name")
      .eq("incident_id", incident.id)
      .order("created_at", { ascending: false })
      .returns<CapaRow[]>(),
    supabase
      .from("root_cause_analyses")
      .select("type, data")
      .eq("safety_incident_id", incident.id)
      .returns<{ type: "five_whys" | "fishbone"; data: Record<string, unknown> }[]>(),
  ]);

  const nameById = new Map((members ?? []).map((m) => [m.id, m.full_name || m.email]));

  const photoUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from("safety-incident-photos")
        .createSignedUrl(photo.file_path, 60 * 5);
      return { ...photo, signedUrl: signed?.signedUrl ?? null };
    })
  );

  const capaProofUrls = new Map<string, string>();
  await Promise.all(
    (capaActions ?? [])
      .filter((c) => c.proof_file_path)
      .map(async (c) => {
        const { data: signed } = await supabase.storage.from("capa-proof").createSignedUrl(c.proof_file_path!, 60 * 5);
        if (signed?.signedUrl) capaProofUrls.set(c.id, signed.signedUrl);
      })
  );

  const fiveWhysData = (analyses?.find((a) => a.type === "five_whys")?.data ?? null) as FiveWhysData | null;
  const fishboneData = (analyses?.find((a) => a.type === "fishbone")?.data ?? null) as FishboneData | null;

  const boundUpdate = updateSafetyIncident.bind(null, incident.id);
  const boundAddPhotos = addSafetyIncidentPhotos.bind(null, incident.id);
  const boundCreateCapa = createCapaAction.bind(null, incident.id);

  const overdue = isIncidentOverdue(incident.due_date, incident.status);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/safety/incidents" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to incidents
      </Link>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-faint">{incident.incident_number}</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{incident.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {incidentTypeLabel(incident.type)} · Reported{" "}
            {incident.reported_by ? `by ${nameById.get(incident.reported_by)} ` : ""}
            on {new Date(incident.date_reported).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={incidentSeverityLabel(incident.severity)} tone={incidentSeverityTone(incident.severity)} />
          <StatusBadge label={incidentStatusLabel(incident.status)} tone={incidentStatusTone(incident.status)} />
        </div>
      </div>

      <div className="surface mt-6 p-6">
        <h2 className="text-sm font-semibold text-faint">Report Details</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">{incident.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Date Occurred</dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">
              {new Date(incident.date_occurred).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Location</dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">
              {incident.location_text || "—"}
              {incident.latitude != null && incident.longitude != null && (
                <>
                  {" "}
                  <a
                    href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
                    className="link-brand"
                    target="_blank"
                    rel="noreferrer"
                  >
                    (map)
                  </a>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Department</dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">{incident.department || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Injured Person</dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">{incident.injured_person_name || "—"}</dd>
          </div>
        </dl>

        {photoUrls.length > 0 && (
          <div className="mt-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Photos</dt>
            <div className="mt-2 flex flex-wrap gap-2">
              {photoUrls.map(
                (photo) =>
                  photo.signedUrl && (
                    <a key={photo.id} href={photo.signedUrl} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.signedUrl}
                        alt={photo.file_name}
                        className="h-20 w-20 rounded-md border object-cover"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </a>
                  )
              )}
            </div>
          </div>
        )}

        <form action={boundAddPhotos} className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <IncidentPhotosField name="photos" label="Add more photos" />
          <button type="submit" className="btn-secondary mt-2">
            Upload
          </button>
        </form>
      </div>

      <form action={boundUpdate} className="surface mt-6 space-y-4 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">Status &amp; Ownership</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-[var(--text-primary)]">
              Status
            </label>
            <select id="status" name="status" defaultValue={incident.status} className="field mt-1">
              {INCIDENT_STATUSES.map((s) => (
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
            <select id="assignedTo" name="assignedTo" defaultValue={incident.assigned_to ?? ""} className="field mt-1">
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
          <input id="dueDate" name="dueDate" type="date" defaultValue={incident.due_date ?? ""} className="field mt-1" />
          {overdue && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>Overdue</p>}
        </div>
        <div>
          <label htmlFor="rootCause" className="block text-sm font-medium text-[var(--text-primary)]">
            Root cause summary
          </label>
          <textarea id="rootCause" name="rootCause" rows={3} defaultValue={incident.root_cause ?? ""} className="field mt-1" />
        </div>
        {incident.closed_at && (
          <p className="text-xs text-faint">Closed on {new Date(incident.closed_at).toLocaleDateString()}</p>
        )}
        <button type="submit" className="btn-primary w-full">
          Save
        </button>
      </form>

      <div className="surface mt-6 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">Root Cause Analysis Tools</h2>
        <p className="mt-1 text-xs text-faint">
          Optional aids for working through why this happened — save one and its summary shows up here.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <FiveWhysTool subjectId={incident.id} initialData={fiveWhysData} saveAction={saveIncidentFiveWhys} />
          <FishboneTool subjectId={incident.id} initialData={fishboneData} saveAction={saveIncidentFishbone} />
        </div>

        {fiveWhysData && (fiveWhysData.problem || fiveWhysData.whys.some(Boolean)) && (
          <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">5 Whys</h3>
            {fiveWhysData.problem && (
              <p className="mt-2 text-sm text-muted">
                <span className="font-medium text-[var(--text-primary)]">Problem:</span> {fiveWhysData.problem}
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

        {fishboneData &&
          (fishboneData.problem || Object.values(fishboneData).some((v) => Array.isArray(v) && v.length)) && (
            <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Fishbone Diagram</h3>
              {fishboneData.problem && (
                <p className="mt-2 text-sm text-muted">
                  <span className="font-medium text-[var(--text-primary)]">Problem / Effect:</span> {fishboneData.problem}
                </p>
              )}
              <div className="mt-3 overflow-x-auto">
                <FishboneDiagramExpandable data={fishboneData} />
              </div>
            </div>
          )}
      </div>

      <div className="surface mt-6 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">CAPA — Corrective &amp; Preventive Actions</h2>

        {(capaActions ?? []).length > 0 && (
          <div className="mt-4 space-y-4">
            {(capaActions ?? []).map((capa) => {
              const capaOverdue = isCapaOverdue(capa.due_date, capa.status);
              const boundUpdateCapa = updateCapaAction.bind(null, incident.id, capa.id);
              return (
                <div key={capa.id} className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[var(--text-primary)]">{capa.description}</p>
                    <StatusBadge label={capaStatusLabel(capa.status)} tone={capaStatusTone(capa.status)} />
                  </div>
                  <p className="mt-1 text-xs text-faint">
                    {capa.assigned_to ? nameById.get(capa.assigned_to) : "Unassigned"}
                    {capa.due_date && ` · Due ${new Date(capa.due_date).toLocaleDateString()}`}
                    {capaOverdue && (
                      <span style={{ color: "var(--danger)" }}> (overdue)</span>
                    )}
                  </p>
                  {capa.proof_file_path && capaProofUrls.get(capa.id) && (
                    <p className="mt-1 text-xs">
                      <a href={capaProofUrls.get(capa.id)} className="link-brand">
                        Proof: {capa.proof_file_name}
                      </a>
                    </p>
                  )}
                  {capa.status !== "completed" && (
                    <form action={boundUpdateCapa} className="mt-2 flex flex-wrap items-end gap-2">
                      <select name="status" defaultValue={capa.status} className="field w-auto py-1.5 text-sm">
                        {CAPA_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="file"
                        name="proofFile"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        className="text-xs text-muted file:mr-2 file:rounded-md file:border-0 file:bg-[var(--surface-hover)] file:px-2 file:py-1 file:text-xs file:font-medium file:text-[var(--text-primary)]"
                      />
                      <button type="submit" className="btn-secondary">
                        Update
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <form action={boundCreateCapa} className="mt-6 space-y-3 border-t pt-6" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add a corrective action</h3>
          <div>
            <label htmlFor="capaDescription" className="block text-sm font-medium text-[var(--text-primary)]">
              Description
            </label>
            <textarea id="capaDescription" name="description" rows={2} className="field mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="capaAssignedTo" className="block text-sm font-medium text-[var(--text-primary)]">
                Assign to
              </label>
              <select id="capaAssignedTo" name="assignedTo" defaultValue="" className="field mt-1">
                <option value="">Unassigned</option>
                {(members ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="capaDueDate" className="block text-sm font-medium text-[var(--text-primary)]">
                Due date
              </label>
              <input id="capaDueDate" name="dueDate" type="date" className="field mt-1" />
            </div>
          </div>
          <button type="submit" className="btn-secondary w-full">
            Add action
          </button>
        </form>
      </div>
    </div>
  );
}
