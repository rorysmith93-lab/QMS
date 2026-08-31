import Link from "next/link";
import { createInfrastructureAsset } from "@/app/dashboard/equipment/infrastructure/actions";
import { INFRASTRUCTURE_CATEGORIES } from "@/lib/infrastructure";

export default async function NewInfrastructureAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/equipment/infrastructure" className="text-sm text-muted hover:text-[var(--text-primary)]">
        ← Back to infrastructure
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">New asset</h1>
      <p className="mt-1 text-sm text-muted">A building, IT system, piece of production equipment, or vehicle.</p>

      {error && (
        <p role="alert" className="banner-error mt-4">
          {error}
        </p>
      )}

      <form action={createInfrastructureAsset} className="surface mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)]">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. CNC Mill #2, Main Workshop, Sales Order System"
            className="field mt-1"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-[var(--text-primary)]">
            Category
          </label>
          <select id="category" name="category" defaultValue="production_equipment" className="field mt-1">
            {INFRASTRUCTURE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-[var(--text-primary)]">
            Location <span className="text-faint">(optional)</span>
          </label>
          <input id="location" name="location" type="text" placeholder="e.g. Bay 3" className="field mt-1" />
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            name="requiresMaintenance"
            defaultChecked
            className="h-4 w-4 rounded"
            style={{ accentColor: "var(--brand)" }}
          />
          Needs scheduled maintenance
        </label>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-primary)]">
            Notes <span className="text-faint">(optional)</span>
          </label>
          <textarea id="notes" name="notes" rows={2} className="field mt-1" />
        </div>

        <button type="submit" className="btn-primary w-full">
          Add to register
        </button>
      </form>
    </div>
  );
}
