import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import {
  addVersion,
  approveDocument,
  archiveDocument,
  checkDocument,
  createRevision,
  returnToDraft,
} from "@/app/dashboard/documents/actions";
import { canActOnCategory, getWorkflowMode } from "@/lib/document-authorization";
import {
  categoryLabel,
  generatedSourceHref,
  generatedSourceLabel,
  statusLabel,
  statusTone,
} from "@/lib/documents";
import { StatusBadge } from "@/components/status-badge";

type DocumentRow = {
  id: string;
  title: string;
  document_number: string | null;
  category: string;
  status: string;
  created_by: string | null;
  created_at: string;
  current_version_id: string | null;
  checked_by: string | null;
  checked_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  generated_from_type: string | null;
  generated_from_id: string | null;
};

type VersionRow = {
  id: string;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const { data: document } = await supabase
    .from("documents")
    .select(
      "id, title, document_number, category, status, created_by, created_at, current_version_id, checked_by, checked_at, approved_by, approved_at, generated_from_type, generated_from_id"
    )
    .eq("id", id)
    .single<DocumentRow>();

  if (!document) {
    notFound();
  }

  const { data: versions } = await supabase
    .from("document_versions")
    .select("id, version_number, file_path, file_name, file_size, uploaded_by, uploaded_at")
    .eq("document_id", id)
    .order("version_number", { ascending: false })
    .returns<VersionRow[]>();

  // Look up the display names of whoever created the document / uploaded
  // each version / checked / approved it, in one go.
  const profileIds = Array.from(
    new Set(
      [document.created_by, document.checked_by, document.approved_by, ...(versions ?? []).map((v) => v.uploaded_by)].filter(
        (v): v is string => Boolean(v)
      )
    )
  );

  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Someone"]));

  // Signed URLs let us serve files from a private bucket without making
  // them public — each link only works for a short time.
  const versionsWithUrls = await Promise.all(
    (versions ?? []).map(async (version) => {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(version.file_path, 60 * 5);
      return { ...version, signedUrl: signed?.signedUrl ?? null };
    })
  );

  const [workflowMode, canCheck, canApprove, canAuthor] = await Promise.all([
    getWorkflowMode(supabase, profile.company_id, document.category),
    canActOnCategory(supabase, profile.company_id, document.category, profile.id, "checker"),
    canActOnCategory(supabase, profile.company_id, document.category, profile.id, "approver"),
    canActOnCategory(supabase, profile.company_id, document.category, profile.id, "author"),
  ]);

  const boundAddVersion = addVersion.bind(null, document.id);
  const boundCheck = checkDocument.bind(null, document.id);
  const boundApprove = approveDocument.bind(null, document.id);
  const boundArchive = archiveDocument.bind(null, document.id);
  const boundReturnToDraft = returnToDraft.bind(null, document.id);
  const boundCreateRevision = createRevision.bind(null, document.id);

  // An auto-generated entry (see src/lib/generated-documents.ts) has its
  // whole lifecycle driven by its source — manual check/approve/archive/
  // revise/upload here would fight with that sync instead of cooperating
  // with it, so none of those controls apply to it.
  const isGenerated = Boolean(document.generated_from_type && document.generated_from_id);

  const showCheckButton =
    !isGenerated && workflowMode === "check_and_approve" && document.status === "draft" && canCheck;
  const showApproveButton =
    !isGenerated &&
    canApprove &&
    (workflowMode === "check_and_approve" ? document.status === "checked" : document.status === "draft");
  const showArchiveButton = !isGenerated && canApprove && document.status === "approved";
  // Deliberately checked-only — once a document is Approved, sending it
  // back to Draft with no new content would just quietly un-approve a
  // controlled document. Revising an approved document goes through
  // "Create revision" instead, which produces the next version (copied
  // from the current one) rather than un-approving with nothing new.
  const showReturnToDraftButton = !isGenerated && document.status === "checked";
  const showCreateRevisionButton = !isGenerated && document.status === "approved" && canAuthor;

  return (
    <div>
      <Link href="/dashboard/documents" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to documents
      </Link>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      {isGenerated && document.generated_from_type && document.generated_from_id && (
        <p className="mt-4 text-sm text-muted">
          Generated automatically from{" "}
          <Link
            href={generatedSourceHref(document.generated_from_type, document.generated_from_id)}
            className="link-brand"
          >
            {generatedSourceLabel(document.generated_from_type)}
          </Link>{" "}
          — edit it there to update this PDF. A new version is added here each time it&apos;s
          approved again; nothing here is editable directly.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{document.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {document.document_number ? `${document.document_number} · ` : ""}
            {categoryLabel(document.category)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showCheckButton && (
            <form action={boundCheck}>
              <button type="submit" className="btn-secondary">
                Mark as checked
              </button>
            </form>
          )}
          {showApproveButton && (
            <form action={boundApprove}>
              <button type="submit" className="btn-primary">
                Approve
              </button>
            </form>
          )}
          {showCreateRevisionButton && (
            <form action={boundCreateRevision}>
              <button type="submit" className="btn-secondary">
                Create revision
              </button>
            </form>
          )}
          {showArchiveButton && (
            <form action={boundArchive}>
              <button type="submit" className="btn-secondary">
                Archive
              </button>
            </form>
          )}
          {showReturnToDraftButton && (
            <form action={boundReturnToDraft}>
              <button type="submit" className="btn-secondary">
                Return to draft
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <StatusBadge label={statusLabel(document.status)} tone={statusTone(document.status)} />
        {document.checked_by && document.checked_at && (
          <span className="text-xs text-faint">
            Checked by {nameById.get(document.checked_by)} on {new Date(document.checked_at).toLocaleDateString()}
          </span>
        )}
        {document.approved_by && document.approved_at && (
          <span className="text-xs text-faint">
            Approved by {nameById.get(document.approved_by)} on{" "}
            {new Date(document.approved_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {!showCheckButton && !showApproveButton && document.status !== "approved" && document.status !== "archived" && (
        <p className="mt-2 text-xs text-faint">
          {workflowMode === "check_and_approve" && document.status === "draft" && !canCheck
            ? "Waiting on someone authorized to check this category — see Authorization."
            : workflowMode !== "check_and_approve" && document.status === "draft" && !canApprove
              ? "Waiting on someone authorized to approve this category — see Authorization."
              : null}
        </p>
      )}

      <div className="surface mt-8 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">Version history</h2>
        </div>

        <div className="overflow-x-auto"><table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-faint">
                Version
              </th>
              <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-faint">
                File
              </th>
              <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-faint">
                Uploaded by
              </th>
              <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-faint">
                Date
              </th>
              <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-faint">
                <span className="sr-only">Download</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {versionsWithUrls.map((version) => (
              <tr key={version.id} className="list-row">
                <td className="py-2">
                  <span className="text-[var(--text-primary)]">v{version.version_number}</span>
                  {version.id === document.current_version_id && (
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}
                    >
                      Current
                    </span>
                  )}
                </td>
                <td className="py-2 text-muted">{version.file_name}</td>
                <td className="py-2 text-muted">
                  {version.uploaded_by ? nameById.get(version.uploaded_by) : "—"}
                </td>
                <td className="py-2 text-muted">
                  {new Date(version.uploaded_at).toLocaleString()}
                </td>
                <td className="py-2 text-right">
                  {version.signedUrl && (
                    <a href={version.signedUrl} className="link-brand">
                      Download<span className="sr-only"> v{version.version_number}</span>
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>

        {!isGenerated && (
          <>
            <form
              action={boundAddVersion}
              className="mt-6 flex items-end gap-3 border-t pt-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex-1">
                <label htmlFor="file" className="block text-sm font-medium text-[var(--text-primary)]">
                  Upload new version
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
              <button type="submit" className="btn-primary">
                Upload
              </button>
            </form>
            <p className="mt-2 text-xs text-faint">
              Uploading a new version resets it back to Draft — any existing check/approval no longer applies.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
