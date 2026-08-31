import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { safetyCategoryLabel, safetyStatusLabel, safetyStatusTone } from "@/lib/safety-documents";
import { dateStatus } from "@/lib/dates";
import { StatusBadge } from "@/components/status-badge";
import { canAccess } from "@/lib/roles";
import { SafetyTabs } from "@/components/safety-tabs";

type SafetyDocumentRow = {
  id: string;
  title: string;
  document_number: string | null;
  category: string;
  status: string;
  review_due_date: string | null;
  updated_at: string;
};

export default async function SafetyDocumentsPage() {
  const { profile, supabase } = await requireProfile();

  const { data: documents } = await supabase
    .from("safety_documents")
    .select("id, title, document_number, category, status, review_due_date, updated_at")
    .order("updated_at", { ascending: false })
    .returns<SafetyDocumentRow[]>();

  return (
    <div>
      <SafetyTabs active="documents" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Safety Documents</h1>
          <p className="mt-1 text-sm text-muted">
            OH&amp;S policies, risk assessments, permits, and contractor agreements — version
            controlled and approved the same way as QMS Documents.
          </p>
        </div>
        <div className="flex gap-2">
          {canAccess(profile.role, "safetyAuthorization") && (
            <Link href="/dashboard/safety/documents/authorization" className="btn-secondary">
              Authorization
            </Link>
          )}
          <Link href="/dashboard/safety/documents/new" className="btn-primary">
            New document
          </Link>
        </div>
      </div>

      <div className="surface mt-6 overflow-hidden">
        {!documents || documents.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No safety documents yet. Click &ldquo;New document&rdquo; to add your first one.
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Doc #
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Review due
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                  Last updated
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const review = dateStatus(doc.review_due_date, { noDateLabel: "No review date" });
                return (
                  <tr key={doc.id} className="list-row">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/safety/documents/${doc.id}`} className="link-brand row-link">
                        {doc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{doc.document_number || "—"}</td>
                    <td className="px-4 py-3 text-muted">{safetyCategoryLabel(doc.category)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={safetyStatusLabel(doc.status)} tone={safetyStatusTone(doc.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={review.label} tone={review.tone} />
                    </td>
                    <td className="px-4 py-3 text-muted">{new Date(doc.updated_at).toLocaleDateString()}</td>
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
