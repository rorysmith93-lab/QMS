import Image from "next/image";
import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { calibrationStatus } from "@/lib/calibration";
import { StatusBadge } from "@/components/status-badge";
import { EquipmentTabs } from "@/components/equipment-tabs";

const IMAGE_BUCKET = "equipment-images";

type EquipmentRow = {
  id: string;
  name: string;
  image_path: string | null;
  requires_calibration: boolean;
};

export default async function EquipmentPage() {
  const { supabase } = await requireProfile();

  const { data: items } = await supabase
    .from("equipment_items")
    .select("id, name, image_path, requires_calibration")
    .order("name")
    .returns<EquipmentRow[]>();

  const equipmentList = items ?? [];

  // One query for the most recent calibration per item — cheap enough at
  // this scale to fetch everything and reduce to "latest per item" in JS,
  // same approach the rest of the app takes for small per-company tables.
  const calibratedIds = equipmentList.filter((i) => i.requires_calibration).map((i) => i.id);
  const { data: calibrations } = calibratedIds.length
    ? await supabase
        .from("equipment_calibrations")
        .select("equipment_item_id, next_due_date, calibrated_date")
        .in("equipment_item_id", calibratedIds)
        .order("calibrated_date", { ascending: false })
    : { data: [] as { equipment_item_id: string; next_due_date: string | null; calibrated_date: string }[] };

  const latestDueByItem = new Map<string, string | null>();
  for (const record of calibrations ?? []) {
    if (!latestDueByItem.has(record.equipment_item_id)) {
      latestDueByItem.set(record.equipment_item_id, record.next_due_date);
    }
  }

  const itemsWithUrls = await Promise.all(
    equipmentList.map(async (item) => {
      if (!item.image_path) return { ...item, imageUrl: null };
      const { data: signed } = await supabase.storage
        .from(IMAGE_BUCKET)
        .createSignedUrl(item.image_path, 60 * 5);
      return { ...item, imageUrl: signed?.signedUrl ?? null };
    })
  );

  const requiringCalibration = equipmentList.filter((i) => i.requires_calibration);
  const notYetCalibrated = requiringCalibration.filter((i) => !latestDueByItem.has(i.id)).length;
  const dueStatuses = requiringCalibration
    .filter((i) => latestDueByItem.has(i.id))
    .map((i) => calibrationStatus(latestDueByItem.get(i.id) ?? null));
  const expiredCount = dueStatuses.filter((s) => s.label === "Expired").length + notYetCalibrated;
  const expiringSoonCount = dueStatuses.filter((s) => s.label === "Expiring soon").length;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Equipment</h1>
          <p className="mt-1 text-sm text-muted">
            Tools and equipment your work instructions can require.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/equipment/export" className="btn-secondary">
            Export CSV
          </Link>
          <Link href="/dashboard/equipment/new" className="btn-primary">
            New equipment
          </Link>
        </div>
      </div>

      <EquipmentTabs active="equipment" />

      {requiringCalibration.length > 0 && (
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="surface p-4">
            <dt className="text-xs text-faint">Requires calibration</dt>
            <dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{requiringCalibration.length}</dd>
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
            <dt className="text-xs text-faint">Overdue / never calibrated</dt>
            <dd
              className="mt-1 text-xl font-semibold"
              style={{ color: expiredCount ? "var(--danger)" : "var(--text-primary)" }}
            >
              {expiredCount}
            </dd>
          </div>
        </dl>
      )}

      {itemsWithUrls.length === 0 ? (
        <p className="surface mt-6 p-8 text-center text-sm text-muted">
          Nothing in the library yet. Click &ldquo;New equipment&rdquo; to add your first item.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {itemsWithUrls.map((item) => {
            const status = item.requires_calibration
              ? latestDueByItem.has(item.id)
                ? calibrationStatus(latestDueByItem.get(item.id) ?? null)
                : { label: "Not calibrated", tone: "critical" as const }
              : null;

            return (
              <Link
                key={item.id}
                href={`/dashboard/equipment/${item.id}`}
                className="surface flex flex-col items-center gap-2 p-4 hover:bg-[var(--surface-hover)]"
              >
                <div
                  className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border"
                  style={{ borderColor: "var(--border)", backgroundColor: "#fff" }}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={80}
                      height={80}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">No photo</span>
                  )}
                </div>
                <span className="text-center text-sm text-[var(--text-primary)]">{item.name}</span>
                {status && <StatusBadge label={status.label} tone={status.tone} />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
