import Link from "next/link";
import { createEquipment } from "@/app/dashboard/equipment/actions";
import { EquipmentPhotoField } from "@/components/equipment-photo-field";

export default async function NewEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/equipment" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to equipment
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">New equipment</h1>
      <p className="mt-1 text-sm text-muted">
        Add a photo and we&apos;ll automatically cut out the background and place it on white.
      </p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createEquipment} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)]">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. 10mm Socket Wrench"
            className="field mt-1"
          />
        </div>

        <EquipmentPhotoField name="image" />

        <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            name="requiresCalibration"
            className="h-4 w-4 rounded"
            style={{ accentColor: "var(--brand)" }}
          />
          Requires calibration
        </label>

        <button type="submit" className="btn-primary w-full">
          Add to library
        </button>
      </form>
    </div>
  );
}
