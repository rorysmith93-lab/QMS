import Link from "next/link";
import { requireProfile } from "@/lib/current-profile";
import { regenerateNcrSyncKey, updateBranding, uploadLogo } from "@/app/dashboard/settings/actions";
import { BrandColorField } from "@/app/dashboard/settings/brand-color-field";
import { SelectOnFocusField } from "@/components/select-on-focus-field";
import { LogoUploadField } from "@/components/logo-upload-field";
import { AccessDenied } from "@/components/access-denied";
import { canAccess } from "@/lib/roles";
import { DEFAULT_BRAND_COLOR } from "@/lib/color";
import { DEFAULT_FONT_ID, FONT_OPTIONS } from "@/lib/fonts";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const { profile, supabase } = await requireProfile();

  if (!canAccess(profile.role, "settings")) {
    return <AccessDenied />;
  }

  const companyName = profile.companies?.name ?? "";
  const primaryColor = profile.companies?.primary_color || DEFAULT_BRAND_COLOR;
  const fontFamily = profile.companies?.font_family || DEFAULT_FONT_ID;
  const logoUrl = profile.companies?.logo_path
    ? supabase.storage.from("logos").getPublicUrl(profile.companies.logo_path).data.publicUrl
    : null;

  const { data: syncCompany } = await supabase
    .from("companies")
    .select("ncr_sync_api_key")
    .eq("id", profile.company_id)
    .single<{ ncr_sync_api_key: string | null }>();
  const ncrSyncApiKey = syncCompany?.ncr_sync_api_key ?? null;

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Lightly brand QMS Rapid with your company&apos;s own colour and logo.
          </p>
        </div>
        <Link href="/dashboard/settings/team" className="btn-secondary">
          Team
        </Link>
      </div>

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

      <form action={updateBranding} className="surface mt-6 space-y-4 p-6">
        <h2 className="font-semibold text-[var(--text-primary)]">Company details</h2>

        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-[var(--text-primary)]">
            Company name
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            defaultValue={companyName}
            className="field mt-1"
          />
        </div>

        <BrandColorField defaultValue={primaryColor} />

        <div>
          <label htmlFor="fontFamily" className="block text-sm font-medium text-[var(--text-primary)]">
            Font
          </label>
          <select id="fontFamily" name="fontFamily" defaultValue={fontFamily} className="field mt-1">
            {FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary w-full">
          Save
        </button>
      </form>

      <form action={uploadLogo} className="surface mt-6 space-y-4 p-6">
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">Logo</h2>
          <p className="mt-1 text-xs text-faint">
            PNG or WebP logos have any empty transparent margin trimmed automatically, so the logo
            renders as large and legible as possible in the sidebar and on document headers.
          </p>
        </div>

        <LogoUploadField name="logo" currentImageUrl={logoUrl} />

        <button type="submit" className="btn-primary w-full">
          Upload
        </button>
      </form>

      <div className="surface mt-6 space-y-4 p-6">
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">MES Integration</h2>
          <p className="mt-1 text-sm text-muted">
            Lets a connected Custom MES App push shop-floor NCRs into this company&apos;s
            non-conformance register automatically. In the MES app&apos;s Admin Portal → Settings,
            paste the endpoint and key below.
          </p>
        </div>

        <SelectOnFocusField label="Endpoint URL" value={`${SITE_URL}/api/ncr-sync`} />

        {ncrSyncApiKey ? (
          <SelectOnFocusField label="API key" value={ncrSyncApiKey} />
        ) : (
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)]">API key</label>
            <p className="mt-1 text-sm text-muted">No key generated yet.</p>
          </div>
        )}

        <form action={regenerateNcrSyncKey}>
          <button type="submit" className="btn-secondary">
            {ncrSyncApiKey ? "Regenerate key" : "Generate key"}
          </button>
          {ncrSyncApiKey && (
            <p className="mt-2 text-xs text-faint">
              Regenerating immediately invalidates the old key — update it in MES too, or syncing
              will start failing there.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
