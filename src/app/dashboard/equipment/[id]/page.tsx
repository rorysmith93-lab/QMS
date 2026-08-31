import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import { deleteEquipment, updateEquipment } from "@/app/dashboard/equipment/actions";
import { ConfirmSubmitButton } from "@/app/dashboard/work-instructions/confirm-submit-button";
import { EquipmentPhotoField } from "@/components/equipment-photo-field";
import { CalibrationForm } from "@/components/equipment/calibration-form";
import { calibrationResultLabel, calibrationResultTone, calibrationStatus } from "@/lib/calibration";
import { StatusBadge } from "@/components/status-badge";

const IMAGE_BUCKET = "equipment-images";
const CERTIFICATE_BUCKET = "certificates";

type EquipmentRow = {
  id: string;
  name: string;
  image_path: string | null;
  requires_calibration: boolean;
};

type CalibrationRow = {
  id: string;
  calibrated_date: string;
  next_due_date: string | null;
  performed_by: string | null;
  result: string;
  notes: string | null;
  certificate_path: string | null;
  certificate_name: string | null;
};

export default async function EquipmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const { supabase } = await requireProfile();

  const { data: item } = await supabase
    .from("equipment_items")
    .select("id, name, image_path, requires_calibration")
    .eq("id", id)
    .single<EquipmentRow>();

  if (!item) {
    notFound();
  }

  const imageUrl = item.image_path
    ? (await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(item.image_path, 60 * 5)).data
        ?.signedUrl
    : null;

  const { data: calibrations } = item.requires_calibration
    ? await supabase
        .from("equipment_calibrations")
        .select("id, calibrated_date, next_due_date, performed_by, result, notes, certificate_path, certificate_name")
        .eq("equipment_item_id", item.id)
        .order("calibrated_date", { ascending: false })
        .returns<CalibrationRow[]>()
    : { data: [] as CalibrationRow[] };

  const records = calibrations ?? [];
  const certificateUrlById = new Map<string, string>();
  await Promise.all(
    records
      .filter((r) => r.certificate_path)
      .map(async (r) => {
        const { data: signed } = await supabase.storage
          .from(CERTIFICATE_BUCKET)
          .createSignedUrl(r.certificate_path!, 60 * 5);
        if (signed?.signedUrl) certificateUrlById.set(r.id, signed.signedUrl);
      })
  );

  const latest = records[0] ?? null;
  const status = latest ? calibrationStatus(latest.next_due_date) : null;

  const boundUpdate = updateEquipment.bind(null, item.id);
  const boundDelete = deleteEquipment.bind(null, item.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/equipment" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to equipment
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

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{item.name}</h1>

      <form action={boundUpdate} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)]">
            Name
          </label>
          <input id="name" name="name" type="text" required defaultValue={item.name} className="field mt-1" />
        </div>

        {imageUrl && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="removeImage"
              className="rounded"
              style={{ borderColor: "var(--border-strong)" }}
            />
            Remove current photo
          </label>
        )}

        <EquipmentPhotoField name="image" currentImageUrl={imageUrl ?? undefined} />

        <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            name="requiresCalibration"
            defaultChecked={item.requires_calibration}
            className="h-4 w-4 rounded"
            style={{ accentColor: "var(--brand)" }}
          />
          Requires calibration
        </label>

        <button type="submit" className="btn-primary w-full">
          Save
        </button>
      </form>

      {item.requires_calibration && (
        <div className="surface mt-6 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Calibration</h2>
              {status ? (
                <div className="mt-1 flex items-center gap-2 text-xs text-faint">
                  <StatusBadge label={status.label} tone={status.tone} />
                  {latest?.next_due_date && (
                    <span>Next due {new Date(latest.next_due_date).toLocaleDateString()}</span>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                  Not yet calibrated
                </p>
              )}
            </div>
            <CalibrationForm equipmentId={item.id} />
          </div>

          {records.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No calibration logged yet. Click &ldquo;Log calibration&rdquo; to add the first record.
            </p>
          ) : (
            <div className="overflow-x-auto"><table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th scope="col" className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-faint">
                    Calibrated
                  </th>
                  <th scope="col" className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-faint">
                    Result
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
                {records.map((record) => (
                  <tr key={record.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 pr-4 text-[var(--text-primary)]">
                      {new Date(record.calibrated_date).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge label={calibrationResultLabel(record.result)} tone={calibrationResultTone(record.result)} />
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
                          Certificate
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      <form action={boundDelete} className="mt-4">
        <ConfirmSubmitButton
          confirmText={`Delete "${item.name}" from the equipment library? Work instructions that require it will no longer show it. This can't be undone.`}
          className="btn-secondary w-full"
          style={{ color: "var(--danger)" }}
        >
          Delete this equipment
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
