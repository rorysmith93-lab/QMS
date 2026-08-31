import Link from "next/link";
import { createSafetyDocument } from "@/app/dashboard/safety/documents/actions";
import { SAFETY_DOCUMENT_CATEGORIES, SAFETY_DOCUMENT_TEMPLATES } from "@/lib/safety-documents";

// "Risk Assessment" is deliberately left off this list — the Risk
// Assessment Builder (Dashboard → Safety → Risk Assessments) is now the
// place to create one, so every one gets a real 5x5 matrix instead of an
// arbitrary uploaded file. The category itself still exists in the schema/
// labels so any risk assessments already uploaded here keep displaying
// correctly, and the builder's own approved PDFs land here too.
const NEW_SAFETY_DOCUMENT_CATEGORIES = SAFETY_DOCUMENT_CATEGORIES.filter((c) => c.value !== "risk_assessment");

export default async function NewSafetyDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; template?: string }>;
}) {
  const { error, template: templateId } = await searchParams;
  const template = SAFETY_DOCUMENT_TEMPLATES.find((t) => t.id === templateId) ?? null;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/safety/documents" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to safety documents
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">New safety document</h1>
      <p className="mt-1 text-sm text-muted">This creates the document and uploads its first version.</p>

      <div className="surface mt-4 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-faint">Start from a template</p>
        <p className="mt-1 text-xs text-faint">
          Download a starter text file, fill it in, then upload it below as your first version.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SAFETY_DOCUMENT_TEMPLATES.map((t) => (
            <a
              key={t.id}
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(t.body)}`}
              download={`${t.label.replace(/[^a-zA-Z0-9]+/g, "-")}.txt`}
              className="btn-secondary"
            >
              Download: {t.label}
            </a>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createSafetyDocument} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={template ? template.label : ""}
            placeholder="e.g. Working at Heights Risk Assessment"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="documentNumber" className="block text-sm font-medium text-[var(--text-primary)]">
            Document number <span className="text-faint">(optional)</span>
          </label>
          <input
            id="documentNumber"
            name="documentNumber"
            type="text"
            placeholder="e.g. RA-004"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-[var(--text-primary)]">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={template ? template.category : "ohs_policy"}
            className="field mt-1"
          >
            {NEW_SAFETY_DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-faint">
            Need a risk assessment? Use the{" "}
            <Link href="/dashboard/safety/risk-assessments/new" className="link-brand">
              Risk Assessment Builder
            </Link>{" "}
            instead — it gives you a real 5×5 matrix instead of an uploaded file.
          </p>
        </div>

        <div>
          <label htmlFor="reviewDueDate" className="block text-sm font-medium text-[var(--text-primary)]">
            Review due date <span className="text-faint">(optional)</span>
          </label>
          <input id="reviewDueDate" name="reviewDueDate" type="date" className="field mt-1" />
          <p className="mt-1 text-xs text-faint">Shows as an &ldquo;expiring soon&rdquo; badge once it&apos;s within 60 days.</p>
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium text-[var(--text-primary)]">
            File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"
            className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-hover)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--text-primary)] hover:file:opacity-80"
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Create document
        </button>
      </form>
    </div>
  );
}
