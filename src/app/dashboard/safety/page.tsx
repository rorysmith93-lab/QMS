import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { dateStatus } from "@/lib/dates";
import { isIncidentOverdue } from "@/lib/safety-incidents";
import { riskBandFromScore } from "@/lib/risk-assessments";
import { SafetyTabs } from "@/components/safety-tabs";

export default async function SafetyOverviewPage() {
  const { supabase } = await requireProfile();

  const [{ data: incidents }, { data: safetyDocs }, { data: legalEntries }, { data: riskAssessments }, { data: hazards }] =
    await Promise.all([
      supabase.from("safety_incidents").select("status, due_date"),
      supabase.from("safety_documents").select("review_due_date"),
      supabase.from("legal_register_entries").select("status, next_review_date"),
      supabase.from("risk_assessments").select("review_due_date"),
      supabase.from("risk_assessment_hazards").select("residual_score"),
    ]);

  const openIncidents = (incidents ?? []).filter((i) => i.status !== "closed").length;
  const overdueIncidents = (incidents ?? []).filter((i) => isIncidentOverdue(i.due_date, i.status)).length;
  const docsDueForReview = (safetyDocs ?? []).filter(
    (d) => dateStatus(d.review_due_date).label === "Expiring soon" || dateStatus(d.review_due_date).label === "Expired"
  ).length;
  const nonCompliantEntries = (legalEntries ?? []).filter((e) => e.status === "non_compliant").length;
  const legalDueForReview = (legalEntries ?? []).filter(
    (e) => dateStatus(e.next_review_date).label === "Expiring soon" || dateStatus(e.next_review_date).label === "Expired"
  ).length;
  const raDueForReview = (riskAssessments ?? []).filter(
    (r) => dateStatus(r.review_due_date).label === "Expiring soon" || dateStatus(r.review_due_date).label === "Expired"
  ).length;
  const highRiskHazards = (hazards ?? []).filter((h) => {
    const band = riskBandFromScore(h.residual_score);
    return band === "high" || band === "critical";
  }).length;

  const tiles = [
    {
      label: "Hazards at High/Critical residual risk",
      value: highRiskHazards,
      href: "/dashboard/safety/risk-assessments",
      danger: highRiskHazards > 0,
    },
    {
      label: "Risk assessments due for review",
      value: raDueForReview,
      href: "/dashboard/safety/risk-assessments",
      warn: raDueForReview > 0,
    },
    { label: "Open incidents", value: openIncidents, href: "/dashboard/safety/incidents", warn: openIncidents > 0 },
    { label: "Overdue incidents", value: overdueIncidents, href: "/dashboard/safety/incidents", danger: overdueIncidents > 0 },
    {
      label: "Safety documents due for review",
      value: docsDueForReview,
      href: "/dashboard/safety/documents",
      warn: docsDueForReview > 0,
    },
    {
      label: "Non-compliant legal entries",
      value: nonCompliantEntries,
      href: "/dashboard/safety/legal-register",
      danger: nonCompliantEntries > 0,
    },
    {
      label: "Legal entries due for review",
      value: legalDueForReview,
      href: "/dashboard/safety/legal-register",
      warn: legalDueForReview > 0,
    },
  ];

  return (
    <div>
      <SafetyTabs active="overview" />

      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Safety Management System</h1>
      <p className="mt-1 text-sm text-muted">
        ISO 45001 — document control, legal compliance, and incident/CAPA tracking for occupational
        health &amp; safety.
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="surface p-4 transition-colors hover:bg-[var(--surface-hover)]">
            <dt className="text-xs text-faint">{tile.label}</dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{
                color: tile.danger ? "var(--danger)" : tile.warn ? "var(--warning)" : "var(--text-primary)",
              }}
            >
              {tile.value}
            </dd>
          </Link>
        ))}
      </dl>

      <div className="surface mt-6 grid grid-cols-1 gap-4 p-6 sm:grid-cols-4">
        <Link href="/dashboard/safety/risk-assessments" className="btn-secondary text-center">
          Risk Assessments
        </Link>
        <Link href="/dashboard/safety/documents" className="btn-secondary text-center">
          Safety Documents
        </Link>
        <Link href="/dashboard/safety/legal-register" className="btn-secondary text-center">
          Legal Register
        </Link>
        <Link href="/dashboard/safety/incidents" className="btn-secondary text-center">
          Incidents &amp; CAPA
        </Link>
      </div>
    </div>
  );
}
