import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { infrastructureCategoryLabel, maintenanceStatus } from "@/lib/infrastructure";
import { StatusBadge } from "@/components/status-badge";
import { EquipmentTabs } from "@/components/equipment-tabs";

type AssetRow = {
  id: string;
  name: string;
  category: string;
  location: string | null;
  requires_maintenance: boolean;
};

export default async function InfrastructurePage() {
  const { supabase } = await requireProfile();

  const { data: assets } = await supabase
    .from("infrastructure_assets")
    .select("id, name, category, location, requires_maintenance")
    .order("name")
    .returns<AssetRow[]>();

  const assetList = assets ?? [];

  // Same "latest record per item, reduced in JS" approach as the
  // Equipment tab's calibration lookup — cheap at this scale.
  const maintainedIds = assetList.filter((a) => a.requires_maintenance).map((a) => a.id);
  const { data: records } = maintainedIds.length
    ? await supabase
        .from("infrastructure_maintenance_records")
        .select("infrastructure_asset_id, next_due_date, performed_date")
        .in("infrastructure_asset_id", maintainedIds)
        .order("performed_date", { ascending: false })
    : { data: [] as { infrastructure_asset_id: string; next_due_date: string | null; performed_date: string }[] };

  const latestDueByAsset = new Map<string, string | null>();
  for (const record of records ?? []) {
    if (!latestDueByAsset.has(record.infrastructure_asset_id)) {
      latestDueByAsset.set(record.infrastructure_asset_id, record.next_due_date);
    }
  }

  const requiringMaintenance = assetList.filter((a) => a.requires_maintenance);
  const notYetMaintained = requiringMaintenance.filter((a) => !latestDueByAsset.has(a.id)).length;
  const dueStatuses = requiringMaintenance
    .filter((a) => latestDueByAsset.has(a.id))
    .map((a) => maintenanceStatus(latestDueByAsset.get(a.id) ?? null));
  const expiredCount = dueStatuses.filter((s) => s.label === "Expired").length + notYetMaintained;
  const expiringSoonCount = dueStatuses.filter((s) => s.label === "Expiring soon").length;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Equipment</h1>
          <p className="mt-1 text-sm text-muted">
            Buildings, IT systems, production machinery, and vehicles — clause 7.1.3.
          </p>
        </div>
        <Link href="/dashboard/equipment/infrastructure/new" className="btn-primary">
          New asset
        </Link>
      </div>

      <EquipmentTabs active="infrastructure" />

      {requiringMaintenance.length > 0 && (
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="surface p-4">
            <dt className="text-xs text-faint">Requires maintenance</dt>
            <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{requiringMaintenance.length}</dd>
          </div>
          <div className="surface p-4">
            <dt className="text-xs text-faint">Expiring within 60 days</dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{ color: expiringSoonCount ? "var(--warning)" : "var(--text-primary)" }}
            >
              {expiringSoonCount}
            </dd>
          </div>
          <div className="surface p-4">
            <dt className="text-xs text-faint">Overdue / never maintained</dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{ color: expiredCount ? "var(--danger)" : "var(--text-primary)" }}
            >
              {expiredCount}
            </dd>
          </div>
        </dl>
      )}

      <div className="surface mt-6 overflow-hidden">
        {assetList.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            Nothing in the register yet. Click &ldquo;New asset&rdquo; to add your first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Location
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-faint">
                    Maintenance
                  </th>
                </tr>
              </thead>
              <tbody>
                {assetList.map((asset) => {
                  const status = asset.requires_maintenance
                    ? latestDueByAsset.has(asset.id)
                      ? maintenanceStatus(latestDueByAsset.get(asset.id) ?? null)
                      : { label: "Not yet maintained", tone: "critical" as const }
                    : null;

                  return (
                    <tr key={asset.id} className="list-row">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/equipment/infrastructure/${asset.id}`}
                          className="link-brand row-link"
                        >
                          {asset.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{infrastructureCategoryLabel(asset.category)}</td>
                      <td className="px-4 py-3 text-muted">{asset.location || "—"}</td>
                      <td className="px-4 py-3">
                        {status ? <StatusBadge label={status.label} tone={status.tone} /> : <span className="text-faint">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
