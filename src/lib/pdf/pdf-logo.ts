// Downloads a company logo for use in a PDF header, in a format react-pdf's
// <Image> can actually render (PNG/JPG — not SVG). react-pdf's SVG support
// isn't just missing, it can crash the whole PDF: it tries to parse SVG
// content, and if the file has any embedded text with a font-family it
// doesn't recognize (e.g. exported from a design tool with an "Arial,
// Helvetica, sans-serif" fallback stack baked in), its font resolver
// throws instead of just rendering as best it can.
//
// So when the uploaded logo IS an SVG, this rasterizes it to PNG the
// first time a PDF needs it, caches that PNG in the same storage bucket,
// and records the path on companies.logo_pdf_path — every PDF after that
// just reuses the cached PNG instead of re-converting every time.
import sharp from "sharp";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const LOGO_BUCKET = "logos";

async function downloadRaw(supabase: SupabaseServerClient, path: string): Promise<Buffer | null> {
  const { data: file } = await supabase.storage.from(LOGO_BUCKET).download(path);
  if (!file) return null;
  return Buffer.from(await file.arrayBuffer());
}

export async function downloadPdfLogoBuffer(
  supabase: SupabaseServerClient,
  companyId: string,
  logoPath: string | null
): Promise<Buffer | null> {
  if (!logoPath) return null;

  if (!logoPath.toLowerCase().endsWith(".svg")) {
    // Already a raster format — safe to use as-is, no conversion needed.
    return downloadRaw(supabase, logoPath);
  }

  // Reuse a previously-converted copy if one's already cached for this
  // exact logo.
  const { data: company } = await supabase
    .from("companies")
    .select("logo_pdf_path")
    .eq("id", companyId)
    .single();

  if (company?.logo_pdf_path) {
    const cached = await downloadRaw(supabase, company.logo_pdf_path);
    if (cached) return cached;
    // Cached path recorded but the file's gone missing somehow — fall
    // through and reconvert rather than giving up.
  }

  const svgBuffer = await downloadRaw(supabase, logoPath);
  if (!svgBuffer) return null;

  let pngBuffer: Buffer;
  try {
    pngBuffer = await sharp(svgBuffer).png().toBuffer();
  } catch {
    // Couldn't rasterize it (malformed SVG, etc.) — skip the logo rather
    // than fail the whole PDF over it, same safe fallback as before this
    // conversion existed.
    return null;
  }

  const pdfLogoPath = `${companyId}/logo-pdf.png`;
  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(pdfLogoPath, pngBuffer, { contentType: "image/png", upsert: true });

  if (!uploadError) {
    // Best-effort cache write — if this fails, the PDF being generated
    // right now still gets its logo either way, just via pngBuffer below;
    // it'll simply reconvert next time too.
    await supabase.from("companies").update({ logo_pdf_path: pdfLogoPath }).eq("id", companyId);
  }

  return pngBuffer;
}
