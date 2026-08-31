import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { APPROVAL_STATUSES, approvalStatusLabel, approvalStatusTone, isEvaluationOverdue } from "@/lib/suppliers";
import { StatusBadge } from "@/components/status-badge";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { UpdateSupplierForm } from "@/components/suppliers/update-supplier-form";
import { canAccess } from "@/lib/roles";
import { AccessDenied } from "@/components/access-denied";

type SupplierRow = {
  id: string;
  name: string;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  approval_status: string;
  last_evaluated_date: string | null;
  next_evaluation_date: string | null;
  notes: string | null;
};

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "supplierRegister")) {
    return <AccessDenied />;
  }

  const [{ data: suppliers }, { data: ncRows }] = await Promise.all([
    supabase
      .from("suppliers")
      .select(
        "id, name, category, contact_name, contact_email, contact_phone, approval_status, last_evaluated_date, next_evaluation_date, notes"
      )
      .order("name")
      .returns<SupplierRow[]>(),
    supabase.from("non_conformances").select("id, supplier_id, status").not("supplier_id", "is", null),
  ]);

  // Rolls up NCRs already tagged "Supplier Issue" against a specific
  // supplier — the whole point of linking the two tables, rather than
  // making anyone re-count this by hand.
  const ncCountBySupplier = new Map<string, { total: number; open: number }>();
  for (const nc of ncRows ?? []) {
    if (!nc.supplier_id) continue;
    const current = ncCountBySupplier.get(nc.supplier_id) ?? { total: 0, open: 0 };
    current.total += 1;
    if (nc.status !== "verified_closed") current.open += 1;
    ncCountBySupplier.set(nc.supplier_id, current);
  }

  const approvedCount = (suppliers ?? []).filter((s) => s.approval_status === "approved").length;
  const overdueCount = (suppliers ?? []).filter((s) => isEvaluationOverdue(s.next_evaluation_date)).length;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Supplier Register</h1>
          <p className="mt-1 text-sm text-muted">
            Control of externally provided processes, products and services — clause 8.4. NCRs logged
            with source “Supplier Issue” can be linked to a supplier here and show up automatically
            below.
          </p>
        </div>
        <SupplierForm />
      </div>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="surface p-4">
          <p className="text-xs text-faint">Suppliers</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{(suppliers ?? []).length}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-faint">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{approvedCount}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-faint">Evaluation overdue</p>
          <p
            className="mt-1 text-2xl font-semibold"
            style={{ color: overdueCount > 0 ? "var(--danger)" : "var(--text-primary)" }}
          >
            {overdueCount}
          </p>
        </div>
      </div>

      <div className="surface mt-4 overflow-hidden">
        {!suppliers || suppliers.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No suppliers logged yet. Click &ldquo;Add supplier&rdquo; to start the register.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Supplier
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Supplies
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Next evaluation
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Linked NCRs
                  </th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => {
                  const overdue = isEvaluationOverdue(supplier.next_evaluation_date);
                  const ncCounts = ncCountBySupplier.get(supplier.id);
                  return (
                    <tr key={supplier.id} className="list-row">
                      <td className="px-4 py-3">
                        <p className="text-[var(--text-primary)]">{supplier.name}</p>
                        {(supplier.contact_name || supplier.contact_email) && (
                          <p className="mt-0.5 text-xs text-faint">
                            {[supplier.contact_name, supplier.contact_email].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">{supplier.category || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={approvalStatusLabel(supplier.approval_status)}
                          tone={approvalStatusTone(supplier.approval_status)}
                        />
                      </td>
                      <td className="px-4 py-3" style={{ color: overdue ? "var(--danger)" : "var(--text-secondary)" }}>
                        {supplier.next_evaluation_date
                          ? new Date(supplier.next_evaluation_date).toLocaleDateString()
                          : "—"}
                        {overdue && " (overdue)"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {ncCounts ? (
                          <Link href="/dashboard/non-conformances" className="link-brand">
                            {ncCounts.total} total{ncCounts.open > 0 ? ` · ${ncCounts.open} open` : ""}
                          </Link>
                        ) : (
                          "None"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UpdateSupplierForm supplier={supplier} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-faint">
        Approval statuses: {APPROVAL_STATUSES.map((s) => s.label).join(" · ")}.
      </p>
    </div>
  );
}
