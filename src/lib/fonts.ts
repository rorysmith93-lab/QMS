// The curated font list a company can pick from on the Settings page —
// deliberately NOT free-text entry (risks broken/ugly results). Each id
// maps to a next/font/google-loaded CSS variable declared in
// src/app/layout.tsx (next/font requires static imports, so the fonts
// themselves are loaded there; this file is just the shared lookup both
// the layout and the settings <select> use). "system" is the one
// exception — it uses the native OS font stack directly, no font file
// loaded at all. Kept identical (same ids/labels) to the Custom MES App
// project's src/lib/fonts.ts so both apps offer the same choices.
export type FontId =
  | "inter"
  | "manrope"
  | "work-sans"
  | "source-sans"
  | "ibm-plex-sans"
  | "space-grotesk"
  | "system";

export const FONT_OPTIONS: { id: FontId; label: string; cssValue: string }[] = [
  { id: "inter", label: "Inter (default)", cssValue: "var(--font-inter)" },
  { id: "manrope", label: "Manrope", cssValue: "var(--font-manrope)" },
  { id: "work-sans", label: "Work Sans", cssValue: "var(--font-work-sans)" },
  { id: "source-sans", label: "Source Sans 3", cssValue: "var(--font-source-sans)" },
  { id: "ibm-plex-sans", label: "IBM Plex Sans", cssValue: "var(--font-ibm-plex-sans)" },
  { id: "space-grotesk", label: "Space Grotesk", cssValue: "var(--font-space-grotesk)" },
  {
    id: "system",
    label: "System default",
    cssValue:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
];

export const DEFAULT_FONT_ID: FontId = "inter";

export function isValidFontId(value: string): value is FontId {
  return FONT_OPTIONS.some((f) => f.id === value);
}

export function fontCssValue(id: string): string {
  return FONT_OPTIONS.find((f) => f.id === id)?.cssValue ?? FONT_OPTIONS[0].cssValue;
}
