// Shared vector geometry for the PPE pictograms — ISO 7010 mandatory-sign
// style (blue circle, white pictogram), hand-drawn rather than the exact
// licensed ISO artwork. This file has NO rendering code in it on purpose:
// both the browser (components/ppe-icons.tsx) and the PDF export
// (lib/pdf/ppe-icon-pdf.tsx) read the same shape list and draw it with
// their own primitives, so the icon is guaranteed to be identical
// everywhere it appears — not just similar.
import type { PpeKey } from "./ppe";

// ISO 3864 safety blue.
export const ISO_SIGN_BLUE = "#003DA5";

// fill = solid white silhouette. outline = thick white stroke, no fill
// (bands/frames). detail = thin blue stroke, no fill (cut-in lines).
// detailFill = solid blue fill (small accents like a D-ring or filter).
export type IconShapeMode = "fill" | "outline" | "detail" | "detailFill";

export type IconShape =
  | { kind: "path"; d: string; mode: IconShapeMode }
  | { kind: "circle"; cx: number; cy: number; r: number; mode: IconShapeMode }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; mode: IconShapeMode }
  | { kind: "rect"; x: number; y: number; w: number; h: number; rx?: number; mode: IconShapeMode }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number };

// All shapes are drawn in a 48x48 viewBox; the sign circle itself is
// added by each renderer, not stored here.
export const PPE_ICON_SHAPES: Record<PpeKey, IconShape[]> = {
  eye_protection: [
    { kind: "circle", cx: 15, cy: 25, r: 6.5, mode: "fill" },
    { kind: "circle", cx: 33, cy: 25, r: 6.5, mode: "fill" },
    { kind: "rect", x: 21, y: 23.5, w: 6, h: 3, rx: 1.5, mode: "fill" },
    { kind: "circle", cx: 15, cy: 25, r: 4, mode: "detail" },
    { kind: "circle", cx: 33, cy: 25, r: 4, mode: "detail" },
    { kind: "line", x1: 8.5, y1: 21, x2: 4, y2: 16 },
    { kind: "line", x1: 39.5, y1: 21, x2: 44, y2: 16 },
  ],
  ear_protection: [
    { kind: "path", d: "M14 25 C14 15 34 15 34 25", mode: "outline" },
    { kind: "rect", x: 10, y: 23, w: 8, h: 14, rx: 4, mode: "fill" },
    { kind: "rect", x: 30, y: 23, w: 8, h: 14, rx: 4, mode: "fill" },
  ],
  head_protection: [
    { kind: "path", d: "M10 30 A14 14 0 0 1 38 30 Z", mode: "fill" },
    { kind: "rect", x: 8, y: 29, w: 32, h: 4, rx: 2, mode: "fill" },
    { kind: "line", x1: 24, y1: 17, x2: 24, y2: 27 },
    { kind: "line", x1: 8, y1: 31.5, x2: 40, y2: 31.5 },
  ],
  hand_protection: [
    {
      kind: "path",
      d: "M20 38 V27 Q20 24 22 23 V21 Q22 18 25 18 Q28 18 28 21 V23 Q30 24 30 27 V38 Z",
      mode: "fill",
    },
    { kind: "ellipse", cx: 16.5, cy: 30, rx: 3.8, ry: 5, mode: "fill" },
    { kind: "line", x1: 25, y1: 21, x2: 25, y2: 27 },
  ],
  foot_protection: [
    {
      kind: "path",
      d: "M15 16h6v11.5c0 1 .5 1.7 1.4 2.3l9 5.7c1 .6 1.6 1.6 1.6 2.8v.7H15c-1 0-1.8-.8-1.8-1.8V17.8c0-1 .8-1.8 1.8-1.8Z",
      mode: "fill",
    },
    { kind: "line", x1: 15, y1: 27, x2: 21, y2: 27 },
    { kind: "line", x1: 13.5, y1: 35.5, x2: 35, y2: 35.5 },
  ],
  hi_vis: [
    {
      kind: "path",
      d: "M17 14 L20 14 L24 18 L28 14 L31 14 L35 18 L32 21 L31 20 L31 36 A2 2 0 0 1 29 38 L19 38 A2 2 0 0 1 17 36 L17 20 L16 21 L13 18 Z",
      mode: "fill",
    },
    { kind: "line", x1: 20, y1: 20, x2: 23, y2: 35 },
    { kind: "line", x1: 28, y1: 20, x2: 25, y2: 35 },
  ],
  respiratory_protection: [
    {
      kind: "path",
      d: "M13 24c0-2 1.5-3.5 3.5-3.5h15c2 0 3.5 1.5 3.5 3.5v4c0 3-2.5 6-8 6h-6c-5.5 0-8-3-8-6Z",
      mode: "fill",
    },
    { kind: "circle", cx: 21, cy: 25, r: 2.3, mode: "detailFill" },
    { kind: "circle", cx: 29, cy: 25, r: 2.3, mode: "detailFill" },
    { kind: "line", x1: 13, y1: 22, x2: 9, y2: 20.5 },
    { kind: "line", x1: 35, y1: 22, x2: 39, y2: 20.5 },
  ],
  face_shield: [
    { kind: "path", d: "M15 18 C15 13 33 13 33 18", mode: "outline" },
    { kind: "path", d: "M13 19 Q24 15 35 19 L35 33 Q24 37 13 33 Z", mode: "fill" },
    { kind: "line", x1: 15, y1: 19, x2: 15, y2: 24 },
    { kind: "line", x1: 33, y1: 19, x2: 33, y2: 24 },
  ],
  protective_clothing: [
    {
      kind: "path",
      d: "M18 13c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v3l4 1.5 2 6-4 2-1-3v15c0 1.1-.9 2-2 2H19c-1.1 0-2-.9-2-2V22.5l-1 3-4-2 2-6 4-1.5Z",
      mode: "fill",
    },
    { kind: "line", x1: 24, y1: 17, x2: 24, y2: 34 },
  ],
  fall_protection: [
    { kind: "circle", cx: 24, cy: 15, r: 3.2, mode: "fill" },
    { kind: "rect", x: 17, y: 19, w: 14, h: 14, rx: 3, mode: "fill" },
    { kind: "line", x1: 17, y1: 19, x2: 31, y2: 33 },
    { kind: "line", x1: 31, y1: 19, x2: 17, y2: 33 },
    { kind: "line", x1: 17, y1: 33, x2: 14, y2: 38 },
    { kind: "line", x1: 31, y1: 33, x2: 34, y2: 38 },
    { kind: "circle", cx: 24, cy: 24, r: 1.6, mode: "detailFill" },
  ],
};
