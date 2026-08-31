import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/current-profile";
import { PpeIcon } from "@/components/ppe-icons";
import { ppeLabel, PpeKey } from "@/lib/ppe";
import { fontOption } from "@/lib/work-instruction-font";

const IMAGE_BUCKET = "work-instruction-images";
const EQUIPMENT_BUCKET = "equipment-images";

type ContentStep = {
  position: number;
  title: string | null;
  body: string | null;
  caution: string | null;
  image_path: string | null;
};

type EquipmentSnapshot = { name: string; image_path: string | null };

type VersionRow = {
  id: string;
  version_number: number;
  title: string;
  document_number: string | null;
  content: ContentStep[];
  ppe_items: string[];
  equipment: EquipmentSnapshot[];
  font: string;
  published_at: string;
  published_by: string | null;
};

export default async function WorkInstructionViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { id } = await params;
  const { version: versionParam } = await searchParams;
  const { profile, supabase } = await requireProfile();

  const companyLogoUrl = profile.companies?.logo_path
    ? supabase.storage.from("logos").getPublicUrl(profile.companies.logo_path).data.publicUrl
    : null;

  const { data: wi } = await supabase
    .from("work_instructions")
    .select("id, current_published_version_id")
    .eq("id", id)
    .single();

  if (!wi) {
    notFound();
  }

  const { data: allVersions } = await supabase
    .from("work_instruction_versions")
    .select("id, version_number, published_at")
    .eq("work_instruction_id", id)
    .order("version_number", { ascending: false });

  if (!allVersions || allVersions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <Link
          href={`/dashboard/work-instructions/${id}`}
          className="text-sm text-muted hover:text-[var(--text-primary)]"
        >
          ← Back to builder
        </Link>
        <p className="mt-10 text-muted">
          This work instruction hasn&apos;t been published yet.
        </p>
        <Link href={`/dashboard/work-instructions/${id}`} className="btn-primary mt-4 inline-flex">
          Go to builder
        </Link>
      </div>
    );
  }

  const targetVersionNumber = versionParam ? Number(versionParam) : allVersions[0].version_number;

  const { data: version } = await supabase
    .from("work_instruction_versions")
    .select(
      "id, version_number, title, document_number, content, ppe_items, equipment, font, published_at, published_by"
    )
    .eq("work_instruction_id", id)
    .eq("version_number", targetVersionNumber)
    .single<VersionRow>();

  if (!version) {
    notFound();
  }

  const publisher = version.published_by
    ? (
        await supabase.from("profiles").select("full_name").eq("id", version.published_by).single()
      ).data
    : null;

  const stepsWithUrls = await Promise.all(
    (version.content ?? []).map(async (step) => {
      if (!step.image_path) return { ...step, imageUrl: null };
      const { data: signed } = await supabase.storage
        .from(IMAGE_BUCKET)
        .createSignedUrl(step.image_path, 60 * 5);
      return { ...step, imageUrl: signed?.signedUrl ?? null };
    })
  );

  const equipmentWithUrls = await Promise.all(
    (version.equipment ?? []).map(async (item) => {
      if (!item.image_path) return { ...item, imageUrl: null };
      const { data: signed } = await supabase.storage
        .from(EQUIPMENT_BUCKET)
        .createSignedUrl(item.image_path, 60 * 5);
      return { ...item, imageUrl: signed?.signedUrl ?? null };
    })
  );

  const isCurrent = version.id === wi.current_published_version_id;

  return (
    <div className="mx-auto max-w-3xl" style={{ fontFamily: fontOption(version.font).css }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/dashboard/work-instructions/${id}`}
          className="text-sm text-muted hover:text-[var(--text-primary)]"
        >
          ← Back to builder
        </Link>
        <a
          href={`/dashboard/work-instructions/${id}/pdf?version=${version.version_number}`}
          className="btn-secondary"
        >
          Export to PDF
        </a>
      </div>

      {/* Document header: logo + title, then the controlled-document
          metadata a QMS record is expected to carry. */}
      <div className="surface mt-2 p-6">
        <div className="flex items-center gap-3">
          {companyLogoUrl && (
            // Fixed height, free width (capped) rather than a square box —
            // a landscape logo squeezed into a square renders tiny.
            <Image
              src={companyLogoUrl}
              alt={`${profile.companies?.name ?? "Company"} logo`}
              width={220}
              height={56}
              unoptimized
              className="h-14 w-auto max-w-[220px] shrink-0 object-contain"
            />
          )}
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{version.title}</h1>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Document Number</dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">
              {version.document_number || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Revision</dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">{version.version_number}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Publish Date</dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">
              {new Date(version.published_at).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">Published By</dt>
            <dd className="mt-0.5 text-sm text-[var(--text-primary)]">
              {publisher?.full_name || "someone"}
            </dd>
          </div>
        </dl>
        {!isCurrent && (
          <p className="banner-caution mt-4">This is an older version — not the current one.</p>
        )}
      </div>

      {version.ppe_items?.length > 0 && (
        <div className="surface mt-6 p-6">
          <h2 className="text-sm font-semibold text-faint">Required PPE</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {version.ppe_items.map((key) => (
              <div key={key} className="flex w-16 flex-col items-center gap-1 text-center text-xs">
                <PpeIcon ppeKey={key as PpeKey} />
                <span className="text-muted">{ppeLabel(key)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {equipmentWithUrls.length > 0 && (
        <div className="surface mt-6 p-6">
          <h2 className="text-sm font-semibold text-faint">Required Equipment</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {equipmentWithUrls.map((item, i) => (
              <div key={i} className="flex w-16 flex-col items-center gap-1 text-center text-xs">
                <div
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border"
                  style={{ backgroundColor: "#fff", borderColor: "var(--border)" }}
                >
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <span className="text-muted">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ol className="mt-6 space-y-6">
        {stepsWithUrls.map((step, index) => (
          <li key={index} className="surface p-6">
            <h2 className="font-semibold text-[var(--text-primary)]">
              Step {index + 1}
              {step.title ? `: ${step.title}` : ""}
            </h2>
            {step.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                {step.body}
              </p>
            )}
            {step.caution && (
              <p className="banner-caution mt-3">
                <strong>Caution:</strong> {step.caution}
              </p>
            )}
            {step.imageUrl && (
              <Image
                src={step.imageUrl}
                alt={`Photo for step ${index + 1}`}
                width={480}
                height={320}
                unoptimized
                className="mt-3 max-h-72 w-auto rounded-md border object-contain"
                style={{ borderColor: "var(--border)" }}
              />
            )}
          </li>
        ))}
      </ol>

      {allVersions.length > 1 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-faint">Version history</h2>
          <ul className="surface mt-2 overflow-hidden">
            {allVersions.map((v, i) => (
              <li
                key={v.id}
                className="flex items-center justify-between px-4 py-2 text-sm"
                style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
              >
                <Link
                  href={`/dashboard/work-instructions/${id}/view?version=${v.version_number}`}
                  className="link-brand"
                >
                  Version {v.version_number}
                </Link>
                <span className="text-muted">
                  {new Date(v.published_at).toLocaleDateString()}
                  {v.id === wi.current_published_version_id ? " · Current" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
