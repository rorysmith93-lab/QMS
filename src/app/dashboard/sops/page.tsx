import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { statusLabel, statusTone } from "@/lib/documents";
import { StatusBadge } from "@/components/status-badge";

type SopRow = {
  id: string;
  title: string;
  document_number: string | null;
  status: string;
  updated_at: string;
  steps: { count: number }[];
};

export default async function SopsPage() {
  const { supabase } = await requireProfile();

  const { data: sops } = await supabase
    .from("sops")
    .select("id, title, document_number, status, updated_at, steps:sop_steps(count)")
    .order("updated_at", { ascending: false })
    .returns<SopRow[]>();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">SOPs</h1>
          <p className="mt-1 text-sm text-muted">
            Standard operating procedures, built with a consistent format — purpose, scope,
            responsibilities, and a numbered procedure that can point straight at the relevant
            work instructions.
          </p>
        </div>
        <Link href="/dashboard/sops/new" className="btn-primary">
          New SOP
        </Link>
      </div>

      <div className="surface mt-6 overflow-hidden">
        {!sops || sops.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            None yet. Click &ldquo;New SOP&rdquo; to start building one.
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
                  Steps
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
              {sops.map((sop) => (
                <tr key={sop.id} className="list-row">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/sops/${sop.id}`} className="link-brand row-link">
                      {sop.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{sop.document_number || "—"}</td>
                  <td className="px-4 py-3 text-muted">{sop.steps?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={statusLabel(sop.status)} tone={statusTone(sop.status)} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(sop.updated_at).toLocaleDateString()}
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
