import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { riskAssessmentStatusLabel, riskAssessmentStatusTone, riskLevelFromScore } from "@/lib/risk-assessments";
import { dateStatus } from "@/lib/dates";
import { StatusBadge } from "@/components/status-badge";

type RiskAssessmentRow = {
  id: string;
  title: string;
  document_number: string | null;
  area_or_process: string | null;
  status: string;
  review_due_date: string | null;
  updated_at: string;
  hazards: { residual_score: number }[];
};

export default async function RiskAssessmentsPage() {
  const { supabase } = await requireProfile();

  const { data: riskAssessments } = await supabase
    .from("risk_assessments")
    .select(
      "id, title, document_number, area_or_process, status, review_due_date, updated_at, hazards:risk_assessment_hazards(residual_score)"
    )
    .order("updated_at", { ascending: false })
    .returns<RiskAssessmentRow[]>();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Risk Assessments</h1>
          <p className="mt-1 text-sm text-muted">
            Hazard identification and risk assessment (HIRA) — a 5×5 likelihood × severity matrix for
            each hazard, before and after controls.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/safety/risk-assessments/export" className="btn-secondary">
            Export CSV
          </Link>
          <Link href="/dashboard/safety/risk-assessments/new" className="btn-primary">
            New risk assessment
          </Link>
        </div>
      </div>

      <div className="surface mt-6 overflow-hidden">
        {!riskAssessments || riskAssessments.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            None yet. Click &ldquo;New risk assessment&rdquo; to start building one.
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Area / Process
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Hazards
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Highest residual risk
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Review due
                </th>
              </tr>
            </thead>
            <tbody>
              {riskAssessments.map((ra) => {
                const review = dateStatus(ra.review_due_date, { noDateLabel: "No review date" });
                const highestScore = ra.hazards.length ? Math.max(...ra.hazards.map((h) => h.residual_score)) : null;
                const level = highestScore !== null ? riskLevelFromScore(highestScore) : null;
                return (
                  <tr key={ra.id} className="list-row">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/safety/risk-assessments/${ra.id}`} className="link-brand row-link">
                        {ra.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{ra.area_or_process || "—"}</td>
                    <td className="px-4 py-3 text-muted">{ra.hazards.length}</td>
                    <td className="px-4 py-3">
                      {level ? <StatusBadge label={`${highestScore} — ${level.label}`} tone={level.tone} /> : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={riskAssessmentStatusLabel(ra.status)} tone={riskAssessmentStatusTone(ra.status)} />
                    </td>
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
