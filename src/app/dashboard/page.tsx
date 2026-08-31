import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { StatusBadge } from "@/components/status-badge";
import { ncStatusLabel, ncStatusTone, isOverdue } from "@/lib/non-conformances";
import { calibrationStatus } from "@/lib/calibration";
import { trainingRecordStatus } from "@/lib/training";
import { findingTypeLabel, findingTypeTone } from "@/lib/internal-audits";
import { DEFAULT_BRAND_COLOR, isValidHexColor } from "@/lib/color";
import { OnboardingChecklist, type OnboardingStep } from "@/components/onboarding-checklist";

type NcRow = {
  id: string;
  ncr_number: string;
  title: string;
  status: string;
  created_at: string;
  due_date: string | null;
};

type EquipmentRow = { id: string; name: string };
type CalibrationRow = { equipment_item_id: string; next_due_date: string | null; calibrated_date: string };
type TrainingRow = { id: string; training_title: string; profile_id: string | null; expiry_date: string | null };
type FindingRow = {
  id: string;
  audit_id: string;
  description: string;
  finding_type: string;
  created_at: string;
};
type ObjectiveRow = { id: string; title: string; status: string };
type ProfileRow = { id: string; full_name: string | null; email: string };

export default async function DashboardPage() {
  const { user, profile, supabase } = await requireProfile();
  const companyName = profile.companies?.name ?? "Unknown company";

  const [
    { data: ncs },
    { data: equipmentItems },
    { data: trainingRecords },
    { data: openFindings },
    { data: objectives },
    { data: members },
    { count: policyCount },
    { count: workInstructionCount },
    { count: auditCount },
  ] = await Promise.all([
    supabase
      .from("non_conformances")
      .select("id, ncr_number, title, status, created_at, due_date")
      .order("created_at", { ascending: false })
      .returns<NcRow[]>(),
    supabase.from("equipment_items").select("id, name").eq("requires_calibration", true).returns<EquipmentRow[]>(),
    supabase
      .from("training_records")
      .select("id, training_title, profile_id, expiry_date")
      .returns<TrainingRow[]>(),
    supabase
      .from("audit_findings")
      .select("id, audit_id, description, finding_type, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .returns<FindingRow[]>(),
    supabase.from("quality_objectives").select("id, title, status").returns<ObjectiveRow[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", profile.company_id)
      .returns<ProfileRow[]>(),
    // Onboarding checklist only needs to know whether anything exists yet,
    // not the rows themselves — head:true skips fetching data entirely.
    supabase.from("quality_policies").select("id", { count: "exact", head: true }),
    supabase.from("work_instructions").select("id", { count: "exact", head: true }),
    supabase.from("internal_audits").select("id", { count: "exact", head: true }),
  ]);

  const equipmentIds = (equipmentItems ?? []).map((e) => e.id);
  const auditIds = Array.from(new Set((openFindings ?? []).map((f) => f.audit_id)));

  const [{ data: calibrations }, { data: audits }] = await Promise.all([
    equipmentIds.length
      ? supabase
          .from("equipment_calibrations")
          .select("equipment_item_id, next_due_date, calibrated_date")
          .in("equipment_item_id", equipmentIds)
          .order("calibrated_date", { ascending: false })
          .returns<CalibrationRow[]>()
      : Promise.resolve({ data: [] as CalibrationRow[] }),
    auditIds.length
      ? supabase.from("internal_audits").select("id, audit_number").in("id", auditIds)
      : Promise.resolve({ data: [] as { id: string; audit_number: string }[] }),
  ]);

  const nameById = new Map((members ?? []).map((m) => [m.id, m.full_name || m.email]));
  const auditNumberById = new Map((audits ?? []).map((a) => [a.id, a.audit_number]));

  // NCRs -----------------------------------------------------------------
  const allNcs = ncs ?? [];
  const openNcCount = allNcs.filter((n) => n.status !== "verified_closed").length;
  const overdueNcCount = allNcs.filter((n) => isOverdue(n.due_date, n.status)).length;
  const recentNcs = allNcs.slice(0, 5);

  // Equipment calibration --------------------------------------------------
  const latestDueByItem = new Map<string, string | null>();
  for (const record of calibrations ?? []) {
    if (!latestDueByItem.has(record.equipment_item_id)) {
      latestDueByItem.set(record.equipment_item_id, record.next_due_date);
    }
  }
  const equipmentAttention = (equipmentItems ?? [])
    .map((item) => {
      const hasRecord = latestDueByItem.has(item.id);
      const dueDate = hasRecord ? latestDueByItem.get(item.id) ?? null : null;
      const status = hasRecord ? calibrationStatus(dueDate) : { label: "Not calibrated", tone: "critical" as const };
      return { ...item, status, dueDate };
    })
    .filter((item) => item.status.label === "Expired" || item.status.label === "Expiring soon" || item.status.label === "Not calibrated")
    .sort((a, b) => (a.dueDate ?? "0000-00-00").localeCompare(b.dueDate ?? "0000-00-00"));

  // Training ---------------------------------------------------------------
  const trainingAttention = (trainingRecords ?? [])
    .map((r) => ({ ...r, status: trainingRecordStatus(r.expiry_date) }))
    .filter((r) => r.status.label === "Expired" || r.status.label === "Expiring soon")
    .sort((a, b) => (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""));

  // Objectives ---------------------------------------------------------------
  const objectivesAtRisk = (objectives ?? []).filter((o) => o.status === "at_risk" || o.status === "missed");

  const findingsList = openFindings ?? [];

  const hasBranding =
    Boolean(profile.companies?.logo_path) ||
    Boolean(profile.companies?.primary_color && isValidHexColor(profile.companies.primary_color) && profile.companies.primary_color !== DEFAULT_BRAND_COLOR);

  const onboardingSteps: OnboardingStep[] = [
    {
      label: "Set your quality policy",
      description: "A short statement of what your company commits to on quality.",
      href: "/dashboard/quality-policy",
      done: (policyCount ?? 0) > 0,
    },
    {
      label: "Add your company branding",
      description: "Logo and brand colour, used across the app and on exported documents.",
      href: "/dashboard/settings",
      done: hasBranding,
    },
    {
      label: "Log your first non-conformance",
      description: "Even a small one — this is where CAPA tracking starts.",
      href: "/dashboard/non-conformances/new",
      done: allNcs.length > 0,
    },
    {
      label: "Create a work instruction",
      description: "Step-by-step guidance your team can follow and you can publish/export.",
      href: "/dashboard/work-instructions/new",
      done: (workInstructionCount ?? 0) > 0,
    },
    {
      label: "Schedule an internal audit",
      description: "Required at planned intervals — this is where that schedule starts.",
      href: "/dashboard/internal-audits/new",
      done: (auditCount ?? 0) > 0,
    },
  ];

  const tiles = [
    {
      label: "Open NCRs",
      value: openNcCount,
      sub: overdueNcCount > 0 ? `${overdueNcCount} overdue` : undefined,
      subTone: "var(--danger)",
      href: "/dashboard/non-conformances",
    },
    {
      label: "Equipment needing calibration",
      value: equipmentAttention.length,
      href: "/dashboard/equipment",
    },
    {
      label: "Training expiring/expired",
      value: trainingAttention.length,
      href: "/dashboard/training",
    },
    {
      label: "Open audit findings",
      value: findingsList.length,
      href: "/dashboard/internal-audits",
    },
    {
      label: "Objectives at risk",
      value: objectivesAtRisk.length,
      href: "/dashboard/quality-policy",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back{companyName !== "Unknown company" ? `, ${companyName}` : ""}</h1>
      <p className="mt-1 text-sm text-muted">
        Logged in as <span className="font-medium text-[var(--text-primary)]">{user.email}</span> · Here&apos;s
        what needs attention today.
      </p>

      <OnboardingChecklist steps={onboardingSteps} />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="surface p-4 hover:bg-[var(--surface-hover)]">
            <p className="text-xs text-faint">{tile.label}</p>
            <p
              className="mt-1 text-2xl font-semibold"
              style={{ color: tile.value > 0 ? "var(--warning)" : "var(--text-primary)" }}
            >
              {tile.value}
            </p>
            {tile.sub && (
              <p className="mt-0.5 text-xs" style={{ color: tile.subTone }}>
                {tile.sub}
              </p>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">Recently Raised NCRs</h2>
            <Link href="/dashboard/non-conformances" className="text-xs link-brand">
              View all →
            </Link>
          </div>
          {recentNcs.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing logged yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recentNcs.map((nc) => (
                <li key={nc.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/dashboard/non-conformances/${nc.id}`} className="link-brand">
                      {nc.ncr_number}
                    </Link>
                    <p className="truncate text-[var(--text-primary)]">{nc.title}</p>
                    <p className="text-xs text-faint">{new Date(nc.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge label={ncStatusLabel(nc.status)} tone={ncStatusTone(nc.status)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">Equipment Due for Calibration</h2>
            <Link href="/dashboard/equipment" className="text-xs link-brand">
              View all →
            </Link>
          </div>
          {equipmentAttention.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing due — everything&apos;s in date. 🎉</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {equipmentAttention.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/dashboard/equipment/${item.id}`} className="link-brand">
                      {item.name}
                    </Link>
                    <p className="text-xs text-faint">
                      {item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString()}` : "No record on file"}
                    </p>
                  </div>
                  <StatusBadge label={item.status.label} tone={item.status.tone} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">Training Expiring Soon</h2>
            <Link href="/dashboard/training" className="text-xs link-brand">
              View all →
            </Link>
          </div>
          {trainingAttention.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing expiring — all clear. 🎉</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {trainingAttention.slice(0, 5).map((record) => (
                <li key={record.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-[var(--text-primary)]">{record.training_title}</p>
                    <p className="text-xs text-faint">
                      {record.profile_id ? nameById.get(record.profile_id) ?? "Former team member" : "Former team member"}
                      {record.expiry_date && ` · Expires ${new Date(record.expiry_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <StatusBadge label={record.status.label} tone={record.status.tone} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">Open Audit Findings</h2>
            <Link href="/dashboard/internal-audits" className="text-xs link-brand">
              View all →
            </Link>
          </div>
          {findingsList.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No open findings. 🎉</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {findingsList.slice(0, 5).map((finding) => (
                <li key={finding.id} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/dashboard/internal-audits/${finding.audit_id}`} className="link-brand text-xs">
                      {auditNumberById.get(finding.audit_id) ?? "Audit"}
                    </Link>
                    <StatusBadge label={findingTypeLabel(finding.finding_type)} tone={findingTypeTone(finding.finding_type)} />
                  </div>
                  <p className="mt-0.5 truncate text-[var(--text-primary)]">{finding.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
