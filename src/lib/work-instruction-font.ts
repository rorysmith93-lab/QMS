// A small, fixed set of fonts a work instruction's content can use — kept
// deliberately short because each one maps directly onto one of the PDF
// standard fonts (Helvetica/Times/Courier), which need no font files
// loaded or embedded to render identically everywhere. Keep in sync with
// the CHECK constraint in supabase/wi_branding_and_font_schema.sql.
export const FONT_OPTIONS = [
  {
    value: "sans",
    label: "Sans-serif (Default)",
    css: "var(--font-inter), Arial, Helvetica, sans-serif",
    pdfRegular: "Helvetica",
    pdfBold: "Helvetica-Bold",
  },
  {
    value: "serif",
    label: "Serif",
    css: "Georgia, 'Times New Roman', Times, serif",
    pdfRegular: "Times-Roman",
    pdfBold: "Times-Bold",
  },
  {
    value: "mono",
    label: "Monospace",
    css: "'Courier New', ui-monospace, SFMono-Regular, monospace",
    pdfRegular: "Courier",
    pdfBold: "Courier-Bold",
  },
] as const;

export type WorkInstructionFont = (typeof FONT_OPTIONS)[number]["value"];

export function fontOption(value: string) {
  return FONT_OPTIONS.find((f) => f.value === value) ?? FONT_OPTIONS[0];
}
