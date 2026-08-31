import Link from "next/link";
import { createDocument } from "@/app/dashboard/documents/actions";
import { DOCUMENT_CATEGORIES } from "@/lib/documents";

// "Procedure" is deliberately left off this list — the SOP builder
// (Dashboard → SOPs) is now the place to create a procedure, so every one
// has the same controlled format instead of being an arbitrary uploaded
// file. The category itself still exists in the schema/labels so any
// procedure documents already uploaded here keep displaying correctly.
const NEW_DOCUMENT_CATEGORIES = DOCUMENT_CATEGORIES.filter((c) => c.value !== "procedure");

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/documents" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to documents
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">New document</h1>
      <p className="mt-1 text-sm text-muted">
        This creates the document and uploads its first version.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createDocument} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text-primary)]">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Incoming Inspection Procedure"
            className="field mt-1"
          />
        </div>

        <div>
          <label
            htmlFor="documentNumber"
            className="block text-sm font-medium text-[var(--text-primary)]"
          >
            Document number <span className="text-faint">(optional)</span>
          </label>
          <input
            id="documentNumber"
            name="documentNumber"
            type="text"
            placeholder="e.g. PROC-004"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-[var(--text-primary)]">
            Category
          </label>
          <select id="category" name="category" defaultValue="policy" className="field mt-1">
            {NEW_DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-faint">
            Need a new procedure? Use the <Link href="/dashboard/sops/new" className="link-brand">SOP builder</Link> instead —
            it keeps every procedure in the same controlled format.
          </p>
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
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
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
