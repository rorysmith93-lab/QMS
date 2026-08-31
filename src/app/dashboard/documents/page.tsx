import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { categoryLabel, generatedSourceLabel, statusLabel, statusTone } from "@/lib/documents";
import { StatusBadge } from "@/components/status-badge";

type DocumentRow = {
  id: string;
  title: string;
  document_number: string | null;
  category: string;
  status: string;
  updated_at: string;
  generated_from_type: string | null;
};

export default async function DocumentsPage() {
  const { supabase } = await requireProfile();

  // RLS means this can only ever return documents belonging to our own
  // company, even though we're not filtering by company_id here ourselves.
  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, document_number, category, status, updated_at, generated_from_type")
    .order("updated_at", { ascending: false })
    .returns<DocumentRow[]>();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Documents</h1>
          <p className="mt-1 text-sm text-muted">
            Controlled files — policies, forms, and anything else uploaded rather than built
            in-app. Procedures now live in the SOP builder, and work instructions in their own.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/documents/new" className="btn-primary">
            New document
          </Link>
        </div>
      </div>

      <div className="surface mt-6 overflow-hidden">
        {!documents || documents.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No documents yet. Click &ldquo;New document&rdquo; to add your first one.
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
                  Last updated
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="list-row">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/documents/${doc.id}`} className="link-brand row-link">
                      {doc.title}
                    </Link>
                    {doc.generated_from_type && (
                      <span className="ml-2 text-xs text-faint">
                        Auto · {generatedSourceLabel(doc.generated_from_type)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{doc.document_number || "—"}</td>
                  <td className="px-4 py-3 text-muted">{categoryLabel(doc.category)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={statusLabel(doc.status)} tone={statusTone(doc.status)} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(doc.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
