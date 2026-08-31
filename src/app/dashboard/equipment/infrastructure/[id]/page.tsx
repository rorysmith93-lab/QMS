import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import { deleteInfrastructureAsset, updateInfrastructureAsset } from "@/app/dashboard/equipment/infrastructure/actions";
import { ConfirmSubmitButton } from "@/app/dashboard/work-instructions/confirm-submit-button";
import { MaintenanceForm } from "@/components/infrastructure/maintenance-form";
import { INFRASTRUCTURE_CATEGORIES, maintenanceStatus } from "@/lib/infrastructure";
import { StatusBadge } from "@/components/status-badge";

const CERTIFICATE_BUCKET = "certificates";

type AssetRow = {
  id: string;
  name: string;
  category: string;
  location: string | null;
  requires_maintenance: boolean;
  notes: string | null;
};

type MaintenanceRow = {
  id: string;
  performed_date: string;
  next_due_date: string | null;
  performed_by: string | null;
  notes: string | null;
  certificate_path: string | null;
  certificate_name: string | null;
};

export default async function InfrastructureAssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const { supabase } = await requireProfile();

  const { data: asset } = await supabase
    .from("infrastructure_assets")
    .select("id, name, category, location, requires_maintenance, notes")
    .eq("id", id)
    .single<AssetRow>();

  if (!asset) {
    notFound();
  }

  const { data: records } = asset.requires_maintenance
    ? await supabase
        .from("infrastructure_maintenance_records")
        .select("id, performed_date, next_due_date, performed_by, notes, certificate_path, certificate_name")
        .eq("infrastructure_asset_id", asset.id)
        .order("performed_date", { ascending: false })
        .returns<MaintenanceRow[]>()
    : { data: [] as MaintenanceRow[] };

  const maintenanceRecords = records ?? [];
  const certificateUrlById = new Map<string, string>();
  await Promise.all(
    maintenanceRecords
      .filter((r) => r.certificate_path)
      .map(async (r) => {
        const { data: signed } = await supabase.storage
          .from(CERTIFICATE_BUCKET)
          .createSignedUrl(r.certificate_path!, 60 * 5);
        if (signed?.signedUrl) certificateUrlById.set(r.id, signed.signedUrl);
      })
  );

  const latest = maintenanceRecords[0] ?? null;
  const status = latest ? maintenanceStatus(latest.next_due_date) : null;

  const boundUpdate = updateInfrastructureAsset.bind(null, asset.id);
  const boundDelete = deleteInfrastructureAsset.bind(null, asset.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/equipment/infrastructure" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to infrastructure
      </Link>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="banner-success mt-4">
          Saved.
        </p>
      )}

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{asset.name}</h1>

      <form action={boundUpdate} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)]">
            Name
          </label>
          <input id="name" name="name" type="text" required defaultValue={asset.name} className="field mt-1" />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-[var(--text-primary)]">
            Category
          </label>
          <select id="category" name="category" defaultValue={asset.category} className="field mt-1">
            {INFRASTRUCTURE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-[var(--text-primary)]">
            Location
          </label>
          <input id="location" name="location" type="text" defaultValue={asset.location ?? ""} className="field mt-1" />
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            name="requiresMaintenance"
            defaultChecked={asset.requires_maintenance}
            className="h-4 w-4 rounded"
            style={{ accentColor: "var(--brand)" }}
          />
          Needs scheduled maintenance
        </label>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-primary)]">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={2} defaultValue={asset.notes ?? ""} className="field mt-1" />
        </div>

        <button type="submit" className="btn-primary w-full">
          Save
        </button>
      </form>

      {asset.requires_maintenance && (
        <div className="surface mt-6 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Maintenance</h2>
              {status ? (
                <div className="mt-1 flex items-center gap-2 text-xs text-faint">
                  <StatusBadge label={status.label} tone={status.tone} />
                  {latest?.next_due_date && <span>Next due {new Date(latest.next_due_date).toLocaleDateString()}</span>}
                </div>
              ) : (
                <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                  Not yet maintained
                </p>
              )}
            </div>
            <MaintenanceForm assetId={asset.id} />
          </div>

          {maintenanceRecords.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No maintenance logged yet. Click &ldquo;Log maintenance&rdquo; to add the first record.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="mt-4 w-full text-left text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    <th scope="col" className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-faint">
                      Performed
                    </th>
                    <th scope="col" className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-faint">
                      Next due
                    </th>
                    <th scope="col" className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-faint">
                      Performed by
                    </th>
                    <th scope="col" className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRecords.map((record) => (
                    <tr key={record.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2 pr-4 text-[var(--text-primary)]">
                        {new Date(record.performed_date).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4 text-muted">
                        {record.next_due_date ? new Date(record.next_due_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted">{record.performed_by || "—"}</td>
                      <td className="py-2">
                        {certificateUrlById.has(record.id) && (
                          <a
                            href={certificateUrlById.get(record.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="link-brand text-xs"
                          >
                            File
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <form action={boundDelete} className="mt-4">
        <ConfirmSubmitButton
          confirmText={`Delete "${asset.name}" from the infrastructure register? This can't be undone.`}
          className="btn-secondary w-full"
          style={{ color: "var(--danger)" }}
        >
          Delete this asset
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
