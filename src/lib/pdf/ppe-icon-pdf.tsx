// Renders the shared PPE icon geometry (lib/ppe-icon-shapes.ts) using
// @react-pdf/renderer's own SVG primitives, so the PDF shows the exact
// same icon as the browser (components/ppe-icons.tsx) — same data, two
// renderers.
import { Circle, Ellipse, Line, Path, Rect, Svg } from "@react-pdf/renderer";
import type { PpeKey } from "@/lib/ppe";
import { ISO_SIGN_BLUE, IconShape, PPE_ICON_SHAPES } from "@/lib/ppe-icon-shapes";

function shapeElement(shape: IconShape, index: number) {
  if (shape.kind === "line") {
    return (
      <Line
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
      return <Path key={index} d={shape.d} {...style} />;
    case "circle":
      return <Circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} {...style} />;
    case "ellipse":
      return <Ellipse key={index} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...style} />;
    case "rect":
      return <Rect key={index} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} {...style} />;
  }
}

export function PdfPpeIcon({ ppeKey, size = 26 }: { ppeKey: PpeKey; size?: number }) {
  return (
    <Svg viewBox="0 0 48 48" width={size} height={size}>
      <Circle cx={24} cy={24} r={23} fill={ISO_SIGN_BLUE} />
      {PPE_ICON_SHAPES[ppeKey].map((shape, index) => shapeElement(shape, index))}
    </Svg>
  );
}
