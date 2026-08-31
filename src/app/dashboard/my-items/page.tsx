import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { StatusBadge } from "@/components/status-badge";
import { isOverdue, ncStatusLabel, ncStatusTone } from "@/lib/non-conformances";
import { objectiveStatusLabel, objectiveStatusTone } from "@/lib/quality-policy";
import { trainingRecordStatus } from "@/lib/training";

type NcRow = { id: string; ncr_number: string; title: string; status: string; due_date: string | null };
type ObjectiveRow = { id: string; title: string; status: string; target_date: string | null };
type TrainingRow = { id: string; training_title: string; expiry_date: string | null };

export default async function MyItemsPage() {
  const { profile, supabase } = await requireProfile();

  const [{ data: myNcs }, { data: myObjectives }, { data: myTraining }] = await Promise.all([
    supabase
      .from("non_conformances")
      .select("id, ncr_number, title, status, due_date")
      .eq("assigned_to", profile.id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .returns<NcRow[]>(),
    supabase
      .from("quality_objectives")
      .select("id, title, status, target_date")
      .eq("owner", profile.id)
      .order("target_date", { ascending: true, nullsFirst: false })
      .returns<ObjectiveRow[]>(),
    supabase
      .from("training_records")
      .select("id, training_title, expiry_date")
      .eq("profile_id", profile.id)
      .returns<TrainingRow[]>(),
  ]);

  const openNcs = (myNcs ?? []).filter((n) => n.status !== "verified_closed");
  const attentionTraining = (myTraining ?? [])
    .map((r) => ({ ...r, status: trainingRecordStatus(r.expiry_date) }))
    .filter((r) => r.status.label === "Expired" || r.status.label === "Expiring soon")
    .sort((a, b) => (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""));

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Items</h1>
      <p className="mt-1 text-sm text-muted">
        What&apos;s specifically on you — assigned NCRs, objectives you own, and your own training due for
        renewal.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">My Open NCRs</h2>
            <span className="text-xs text-faint">{openNcs.length}</span>
          </div>
          {openNcs.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing assigned to you right now. 🎉</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {openNcs.map((nc) => {
                const overdue = isOverdue(nc.due_date, nc.status);
                return (
                  <li key={nc.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <Link href={`/dashboard/non-conformances/${nc.id}`} className="link-brand">
                        {nc.ncr_number}
                      </Link>
                      <p className="truncate text-[var(--text-primary)]">{nc.title}</p>
                      {nc.due_date && (
                        <p className="text-xs" style={{ color: overdue ? "var(--danger)" : "var(--text-faint)" }}>
                          Due {new Date(nc.due_date).toLocaleDateString()}
                          {overdue && " (overdue)"}
                        </p>
                      )}
                    </div>
                    <StatusBadge label={ncStatusLabel(nc.status)} tone={ncStatusTone(nc.status)} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">My Quality Objectives</h2>
            <span className="text-xs text-faint">{(myObjectives ?? []).length}</span>
          </div>
          {!myObjectives || myObjectives.length === 0 ? (
            <p className="mt-4 text-sm text-muted">You don&apos;t own any objectives yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {myObjectives.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link href="/dashboard/quality-policy" className="link-brand">
                      {o.title}
                    </Link>
                    {o.target_date && (
                      <p className="text-xs text-faint">Target {new Date(o.target_date).toLocaleDateString()}</p>
                    )}
                  </div>
                  <StatusBadge label={objectiveStatusLabel(o.status)} tone={objectiveStatusTone(o.status)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">My Training Needing Attention</h2>
            <span className="text-xs text-faint">{attentionTraining.length}</span>
          </div>
          {attentionTraining.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing expiring on your record. 🎉</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {attentionTraining.map((record) => (
                <li key={record.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-[var(--text-primary)]">{record.training_title}</p>
                    {record.expiry_date && (
                      <p className="text-xs text-faint">Expires {new Date(record.expiry_date).toLocaleDateString()}</p>
                    )}
                  </div>
                  <StatusBadge label={record.status.label} tone={record.status.tone} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
