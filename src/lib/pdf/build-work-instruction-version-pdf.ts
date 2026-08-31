// Renders a PDF for one already-published work_instruction_versions row.
// Shared by the /pdf export route (GET .../pdf?version=N) and by
// publishWorkInstruction, which uses this to auto-generate the copy that
// lands in Documents — kept as one function so the two never drift apart.
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { createClient } from "@/lib/supabase/server";
import { PdfEquipmentItem, PdfStep, WorkInstructionDocument } from "@/lib/pdf/work-instruction-document";
import { downloadPdfLogoBuffer } from "@/lib/pdf/pdf-logo";
import { isPpeKey, PpeKey } from "@/lib/ppe";
import { fontOption } from "@/lib/work-instruction-font";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const IMAGE_BUCKET = "work-instruction-images";
const EQUIPMENT_BUCKET = "equipment-images";

type RawStep = { title: string | null; body: string | null; caution: string | null; image_path: string | null };
type RawEquipment = { name: string; image_path: string | null };

export async function buildWorkInstructionVersionPdf(
  supabase: SupabaseServerClient,
  workInstructionId: string,
  versionNumber: number,
  companyId: string,
  companyLogoPath: string | null
): Promise<{ buffer: Buffer; filename: string } | null> {
  const { data: version } = await supabase
    .from("work_instruction_versions")
    .select("title, document_number, version_number, content, ppe_items, equipment, font, published_at")
    .eq("work_instruction_id", workInstructionId)
    .eq("version_number", versionNumber)
    .single();

  if (!version) return null;

  const logoBuffer = await downloadPdfLogoBuffer(supabase, companyId, companyLogoPath);

  const rawSteps = (version.content as RawStep[]) ?? [];
  const ppeKeys = ((version.ppe_items as string[]) ?? []).filter(isPpeKey) as PpeKey[];
  const rawEquipment = (version.equipment as RawEquipment[]) ?? [];

  const pdfSteps: PdfStep[] = await Promise.all(
    rawSteps.map(async (step) => {
      let imageBuffer: Buffer | null = null;
      if (step.image_path) {
        const { data: file } = await supabase.storage.from(IMAGE_BUCKET).download(step.image_path);
        if (file) imageBuffer = Buffer.from(await file.arrayBuffer());
      }
      return { title: step.title, body: step.body, caution: step.caution, imageBuffer };
    })
  );

  const pdfEquipment: PdfEquipmentItem[] = await Promise.all(
    rawEquipment.map(async (item) => {
      let imageBuffer: Buffer | null = null;
      if (item.image_path) {
        const { data: file } = await supabase.storage.from(EQUIPMENT_BUCKET).download(item.image_path);
        if (file) imageBuffer = Buffer.from(await file.arrayBuffer());
      }
      return { name: item.name, imageBuffer };
    })
  );

  const { pdfRegular, pdfBold } = fontOption(version.font);

  const pdfBuffer = await renderToBuffer(
    createElement(WorkInstructionDocument, {
      title: version.title,
      documentNumber: version.document_number,
      revision: String(version.version_number),
      publishedDateLabel: new Date(version.published_at).toLocaleDateString(),
      logoBuffer,
      fontRegular: pdfRegular,
      fontBold: pdfBold,
      ppeKeys,
      equipment: pdfEquipment,
      steps: pdfSteps,
    })
  );

  const filename = `${version.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v${version.version_number}.pdf`;
  return { buffer: pdfBuffer, filename };
}
