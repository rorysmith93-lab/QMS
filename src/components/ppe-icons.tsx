// Renders the shared PPE icon geometry (src/lib/ppe-icon-shapes.ts) as a
// browser SVG. See lib/pdf/ppe-icon-pdf.tsx for the PDF-side renderer of
// the exact same data.
import type { SVGProps } from "react";
import type { PpeKey } from "@/lib/ppe";
import { ISO_SIGN_BLUE, IconShape, PPE_ICON_SHAPES } from "@/lib/ppe-icon-shapes";

function ShapeElement({ shape, index }: { shape: IconShape; index: number }) {
  if (shape.kind === "line") {
    return (
      <line
        key={index}
        x1={shape.x1}
        y1={shape.y1}
        x2={shape.x2}
        y2={shape.y2}
        stroke={ISO_SIGN_BLUE}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    );
  }

  const style =
    shape.mode === "fill"
      ? { fill: "#fff" }
      : shape.mode === "outline"
        ? { fill: "none", stroke: "#fff", strokeWidth: 4, strokeLinecap: "round" as const }
        : shape.mode === "detail"
          ? { fill: "none", stroke: ISO_SIGN_BLUE, strokeWidth: 1.4, strokeLinecap: "round" as const }
          : { fill: ISO_SIGN_BLUE }; // detailFill

  switch (shape.kind) {
    case "path":
      return <path key={index} d={shape.d} {...style} />;
    case "circle":
      return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} {...style} />;
    case "ellipse":
      return <ellipse key={index} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...style} />;
    case "rect":
      return <rect key={index} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} {...style} />;
  }
}

export function PpeIcon({ ppeKey, ...props }: SVGProps<SVGSVGElement> & { ppeKey: PpeKey }) {
  return (
    <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden="true" {...props}>
      <circle cx="24" cy="24" r="23" fill={ISO_SIGN_BLUE} stroke="#fff" strokeWidth="1" />
      {PPE_ICON_SHAPES[ppeKey].map((shape, index) => (
        <ShapeElement key={index} shape={shape} index={index} />
      ))}
    </svg>
  );
}
