import { createElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  PdfEquipmentItem,
  PdfStep,
  WorkInstructionDocument,
} from "@/lib/pdf/work-instruction-document";
import { buildWorkInstructionVersionPdf } from "@/lib/pdf/build-work-instruction-version-pdf";
import { downloadPdfLogoBuffer } from "@/lib/pdf/pdf-logo";
import { isPpeKey, PpeKey } from "@/lib/ppe";
import { fontOption } from "@/lib/work-instruction-font";

const IMAGE_BUCKET = "work-instruction-images";
const EQUIPMENT_BUCKET = "equipment-images";

type RawStep = {
  title: string | null;
  body: string | null;
  caution: string | null;
  image_path: string | null;
};

type RawEquipment = { name: string; image_path: string | null };

// GET /dashboard/work-instructions/[id]/pdf            -> current draft
// GET /dashboard/work-instructions/[id]/pdf?version=2  -> that published version
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // The work instruction's own company scoping (via RLS) already limits
  // everything below to this user's company — this lookup is just to find
  // their company's current logo for the header.
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, companies(logo_path)")
    .eq("id", user.id)
    .single<{ company_id: string; companies: { logo_path: string | null } | null }>();

  const logoPath = profile?.companies?.logo_path ?? null;
  const companyId = profile?.company_id;

  const versionParam = request.nextUrl.searchParams.get("version");

  // A published version is immutable and already has its own PDF-building
  // logic shared with publishWorkInstruction's auto-sync into Documents —
  // reuse it here rather than duplicating it.
  if (versionParam && companyId) {
    const built = await buildWorkInstructionVersionPdf(supabase, id, Number(versionParam), companyId, logoPath);

    if (!built) {
      return new NextResponse("Version not found", { status: 404 });
    }

    return new NextResponse(new Uint8Array(built.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${built.filename}"`,
      },
    });
  }

  if (!companyId) {
    return new NextResponse("Not found", { status: 404 });
  }

  let title: string;
  let documentNumber: string | null;
  let revision: string;
  let publishedDateLabel: string | null;
  let rawSteps: RawStep[];
  let ppeKeys: PpeKey[];
  let rawEquipment: RawEquipment[];
  let font: string;

  {
    const { data: wi } = await supabase
      .from("work_instructions")
      .select("title, document_number, ppe_items, font")
      .eq("id", id)
      .single();

    if (!wi) {
      return new NextResponse("Not found", { status: 404 });
    }

    const [{ data: steps }, { data: equipmentRows }] = await Promise.all([
      supabase
        .from("work_instruction_steps")
        .select("title, body, caution, image_path")
        .eq("work_instruction_id", id)
        .order("position", { ascending: true }),
      supabase
        .from("work_instruction_equipment")
        .select("equipment_items(name, image_path)")
        .eq("work_instruction_id", id),
    ]);

    title = wi.title;
    documentNumber = wi.document_number;
    revision = "Draft";
    publishedDateLabel = null;
    rawSteps = steps ?? [];
    ppeKeys = ((wi.ppe_items as string[]) ?? []).filter(isPpeKey);
    rawEquipment = (equipmentRows ?? [])
      .map((row) => row.equipment_items as unknown as RawEquipment | null)
      .filter((e): e is RawEquipment => e !== null);
    font = wi.font;
  }

  const pdfSteps: PdfStep[] = await Promise.all(
    rawSteps.map(async (step) => {
      let imageBuffer: Buffer | null = null;

      if (step.image_path) {
        const { data: file } = await supabase.storage.from(IMAGE_BUCKET).download(step.image_path);
        if (file) {
          imageBuffer = Buffer.from(await file.arrayBuffer());
        }
      }

      return { title: step.title, body: step.body, caution: step.caution, imageBuffer };
    })
  );

  const pdfEquipment: PdfEquipmentItem[] = await Promise.all(
    rawEquipment.map(async (item) => {
      let imageBuffer: Buffer | null = null;
      if (item.image_path) {
        const { data: file } = await supabase.storage
          .from(EQUIPMENT_BUCKET)
          .download(item.image_path);
        if (file) {
          imageBuffer = Buffer.from(await file.arrayBuffer());
        }
      }
      return { name: item.name, imageBuffer };
    })
  );

  const logoBuffer = await downloadPdfLogoBuffer(supabase, companyId, logoPath);

  const { pdfRegular, pdfBold } = fontOption(font);

  const pdfBuffer = await renderToBuffer(
    createElement(WorkInstructionDocument, {
      title,
      documentNumber,
      revision,
      publishedDateLabel,
      logoBuffer,
      fontRegular: pdfRegular,
      fontBold: pdfBold,
      ppeKeys,
      equipment: pdfEquipment,
      steps: pdfSteps,
    })
  );

  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  // TypeScript's DOM lib doesn't consider Node's Buffer a valid response
  // body type, even though it works fine at runtime — a plain Uint8Array
  // satisfies both.
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
