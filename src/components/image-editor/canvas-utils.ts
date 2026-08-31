// Pure drawing/geometry helpers for the photo editor. Kept separate from
// the component so the maths (cropping, rotation, arrow/bubble shapes) is
// easy to read and test on its own.

export type Ratio = "16:9" | "1:1";
export type AnnotationTool = "move" | "arrow" | "bubble";

export type Annotation = {
  type: "arrow" | "bubble";
  // Every coordinate is a FRACTION (0–1) of the frame's width/height, not
  // a raw pixel. That's what lets the same annotation render correctly on
  // both the small editing preview and the larger final export.
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
};

// The two "standard sizes" photos get formatted to.
export const RATIO_DIMENSIONS: Record<Ratio, { width: number; height: number }> = {
  "16:9": { width: 1600, height: 900 },
  "1:1": { width: 1400, height: 1400 },
};

export const MARKUP_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#111827", "#ffffff"];

function isSideways(rotationDeg: number) {
  return rotationDeg % 180 !== 0;
}

// The scale needed for a (possibly rotated) image to fully cover a
// frameW x frameH box, before any extra user zoom is applied — the same
// idea as CSS `object-fit: cover`.
export function coverScale(
  imgW: number,
  imgH: number,
  rotationDeg: number,
  frameW: number,
  frameH: number
) {
  const w = isSideways(rotationDeg) ? imgH : imgW;
  const h = isSideways(rotationDeg) ? imgW : imgH;
  return Math.max(frameW / w, frameH / h);
}

// How far (as a fraction of the frame) the image can be panned in one
// axis before its edge would show inside the frame, given how big the
// scaled image is in that axis.
export function maxPanFraction(scaledSize: number, frameSize: number) {
  return Math.max(0, (scaledSize - frameSize) / 2 / frameSize);
}

export function clampPanFraction(panFrac: number, scaledSize: number, frameSize: number) {
  const max = maxPanFraction(scaledSize, frameSize);
  return Math.min(max, Math.max(-max, panFrac));
}

// Draws the source photo into the frame: rotated, scaled to cover, and
// panned — the "crop" the person has chosen.
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
  rotationDeg: number,
  zoom: number,
  panXFrac: number,
  panYFrac: number
) {
  const scale = coverScale(imgW, imgH, rotationDeg, frameW, frameH) * zoom;
  ctx.save();
  ctx.translate(frameW / 2 + panXFrac * frameW, frameH / 2 + panYFrac * frameH);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(image, -imgW / 2, -imgH / 2, imgW, imgH);
  ctx.restore();
}

export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  a: Annotation,
  frameW: number,
  frameH: number
) {
  const x1 = a.x1 * frameW;
  const y1 = a.y1 * frameH;
  const x2 = a.x2 * frameW;
  const y2 = a.y2 * frameH;
  const lineWidth = Math.max(3, frameW * 0.006);

  ctx.save();
  ctx.strokeStyle = a.color;
  ctx.fillStyle = a.color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (a.type === "arrow") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = Math.max(12, frameW * 0.025);
    const headAngle = Math.PI / 7;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle - headAngle),
      y2 - headLength * Math.sin(angle - headAngle)
    );
    ctx.lineTo(
      x2 - headLength * Math.cos(angle + headAngle),
      y2 - headLength * Math.sin(angle + headAngle)
    );
    ctx.closePath();
    ctx.fill();
  } else {
    // Bubbles are drawn from the centre out: (x1, y1) is where the drag
    // started (the centre), and how far the pointer has moved sets the
    // radius — rather than the two points being opposite corners.
    const rx = Math.max(Math.abs(x2 - x1), 6);
    const ry = Math.max(Math.abs(y2 - y1), 6);
    ctx.beginPath();
    ctx.ellipse(x1, y1, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
