import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { statusLabel, statusTone } from "@/lib/documents";
import { StatusBadge } from "@/components/status-badge";

type WorkInstructionRow = {
  id: string;
  title: string;
  document_number: string | null;
  status: string;
  updated_at: string;
  steps: { count: number }[];
};

export default async function WorkInstructionsPage() {
  const { supabase } = await requireProfile();

  const { data: workInstructions } = await supabase
    .from("work_instructions")
    .select("id, title, document_number, status, updated_at, steps:work_instruction_steps(count)")
    .order("updated_at", { ascending: false })
    .returns<WorkInstructionRow[]>();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Work Instructions</h1>
          <p className="mt-1 text-sm text-muted">
            Step-by-step instructions built right here, with photos and cautions.
          </p>
        </div>
        <Link href="/dashboard/work-instructions/new" className="btn-primary">
          New work instruction
        </Link>
      </div>

      <div className="surface mt-6 overflow-hidden">
        {!workInstructions || workInstructions.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            None yet. Click &ldquo;New work instruction&rdquo; to start building one.
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
              {workInstructions.map((wi) => (
                <tr key={wi.id} className="list-row">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/work-instructions/${wi.id}`} className="link-brand row-link">
                      {wi.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{wi.document_number || "—"}</td>
                  <td className="px-4 py-3 text-muted">{wi.steps?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={statusLabel(wi.status)} tone={statusTone(wi.status)} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(wi.updated_at).toLocaleDateString()}
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
