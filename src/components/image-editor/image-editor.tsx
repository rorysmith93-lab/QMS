"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Annotation,
  AnnotationTool,
  clampPanFraction,
  coverScale,
  drawAnnotation,
  drawBackground,
  MARKUP_COLORS,
  RATIO_DIMENSIONS,
  Ratio,
} from "./canvas-utils";

const PREVIEW_MAX_WIDTH = 560; // CSS pixels; the canvas is drawn much larger internally for a crisp export.
const PAN_STEP = 0.08; // fraction of the frame moved per click of a nudge button

const TOOLS: { id: AnnotationTool; label: string }[] = [
  { id: "move", label: "Move" },
  { id: "arrow", label: "Arrow" },
  { id: "bubble", label: "Bubble" },
];

export function ImageEditor({
  file,
  onCancel,
  onSave,
}: {
  file: File;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // fractions of the frame
  const [tool, setTool] = useState<AnnotationTool>("move");
  const [color, setColor] = useState(MARKUP_COLORS[0]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [draft, setDraft] = useState<Annotation | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragOrigin = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);

  // Load the picked file into an <img> we can draw from.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Changing the crop frame's shape resets pan/zoom (done directly in the
  // click handlers below, not as an effect, so nothing ends up out of
  // bounds for even a single render).
  function changeRatio(next: Ratio) {
    setRatio(next);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function rotateBy(deltaDeg: number) {
    setRotation((r) => (r + deltaDeg + 360) % 360);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  const frame = RATIO_DIMENSIONS[ratio];

  // Given a desired pan (as a fraction of the frame), pull it back within
  // the range that still keeps the image fully covering the frame at the
  // current rotation/zoom. Shared by both drag-to-pan and the nudge
  // buttons below, so they can never disagree on what's "in bounds".
  const clampPan = useCallback(
    (next: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas || !image) return next;
      const scale =
        coverScale(image.naturalWidth, image.naturalHeight, rotation, canvas.width, canvas.height) * zoom;
      const sideways = rotation % 180 !== 0;
      const scaledW = (sideways ? image.naturalHeight : image.naturalWidth) * scale;
      const scaledH = (sideways ? image.naturalWidth : image.naturalHeight) * scale;
      return {
        x: clampPanFraction(next.x, scaledW, canvas.width),
        y: clampPanFraction(next.y, scaledH, canvas.height),
      };
    },
    [image, rotation, zoom]
  );

  function nudgePan(dx: number, dy: number) {
    setPan((prev) => clampPan({ x: prev.x + dx, y: prev.y + dy }));
  }

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(
      ctx,
      image,
      image.naturalWidth,
      image.naturalHeight,
      canvas.width,
      canvas.height,
      rotation,
      zoom,
      pan.x,
      pan.y
    );
    for (const a of annotations) drawAnnotation(ctx, a, canvas.width, canvas.height);
    if (draft) drawAnnotation(ctx, draft, canvas.width, canvas.height);
  }, [image, rotation, zoom, pan, annotations, draft]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  function fractionalPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    canvasRef.current?.setPointerCapture(e.pointerId);
    if (tool === "move") {
      dragOrigin.current = { x: e.clientX, y: e.clientY, pan };
    } else {
      const p = fractionalPoint(e);
      setDraft({ type: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, color });
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "move") {
      if (!dragOrigin.current) return;
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const dxFrac = (e.clientX - dragOrigin.current.x) / rect.width;
      const dyFrac = (e.clientY - dragOrigin.current.y) / rect.height;
      setPan(
        clampPan({
          x: dragOrigin.current.pan.x + dxFrac,
          y: dragOrigin.current.pan.y + dyFrac,
        })
      );
    } else if (draft) {
      const p = fractionalPoint(e);
      setDraft({ ...draft, x2: p.x, y2: p.y });
    }
  }

  function handlePointerUp() {
    dragOrigin.current = null;
    if (draft) {
      setAnnotations((prev) => [...prev, draft]);
      setDraft(null);
    }
  }

  function handleSave() {
    if (!image) return;
    const output = document.createElement("canvas");
    output.width = frame.width;
    output.height = frame.height;
    const ctx = output.getContext("2d");
    if (!ctx) return;

    drawBackground(
      ctx,
      image,
      image.naturalWidth,
      image.naturalHeight,
      output.width,
      output.height,
      rotation,
      zoom,
      pan.x,
      pan.y
    );
    for (const a of annotations) drawAnnotation(ctx, a, output.width, output.height);

    output.toBlob(
      (blob) => {
        if (blob) onSave(blob);
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit photo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="surface w-full max-w-2xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Edit photo</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close editor without using this photo"
            className="text-sm text-muted hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        {!image ? (
          <p className="mt-6 text-sm text-muted">Loading photo…</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-faint">Shape</span>
              {(["16:9", "1:1"] as Ratio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={ratio === r}
                  onClick={() => changeRatio(r)}
                  className="rounded-md border px-2.5 py-1 text-sm"
                  style={{
                    borderColor: ratio === r ? "var(--brand)" : "var(--border-strong)",
                    color: ratio === r ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {r === "16:9" ? "Widescreen" : "Square"}
                </button>
              ))}

              <span className="ml-3 text-xs font-medium uppercase tracking-wide text-faint">Rotate</span>
              <button
                type="button"
                onClick={() => rotateBy(270)}
                aria-label="Rotate left"
                className="btn-secondary"
              >
                ⟲
              </button>
              <button
                type="button"
                onClick={() => rotateBy(90)}
                aria-label="Rotate right"
                className="btn-secondary"
              >
                ⟳
              </button>
            </div>

            <div
              className="mt-4 overflow-hidden rounded-md border"
              style={{ borderColor: "var(--border-strong)", maxWidth: PREVIEW_MAX_WIDTH }}
            >
              {/* width:100% + aspectRatio (rather than a fixed pixel
                  height) means this always exactly fills its wrapper —
                  no gap can open up between them, whatever the modal's
                  actual rendered width turns out to be. */}
              <canvas
                ref={canvasRef}
                width={frame.width}
                height={frame.height}
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  aspectRatio: `${frame.width} / ${frame.height}`,
                  touchAction: "none",
                  cursor: tool === "move" ? "grab" : "crosshair",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                aria-label="Photo preview — drag to reposition or draw markup"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-start gap-6">
              <div className="min-w-[10rem] flex-1">
                <label htmlFor="editor-zoom" className="block text-xs font-medium uppercase tracking-wide text-faint">
                  Zoom
                </label>
                <input
                  id="editor-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </div>

              <div>
                <span className="block text-xs font-medium uppercase tracking-wide text-faint">Position</span>
                <div className="mt-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => nudgePan(-PAN_STEP, 0)}
                    aria-label="Move photo left"
                    className="btn-secondary"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgePan(PAN_STEP, 0)}
                    aria-label="Move photo right"
                    className="btn-secondary"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgePan(0, -PAN_STEP)}
                    aria-label="Move photo up"
                    className="btn-secondary"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgePan(0, PAN_STEP)}
                    aria-label="Move photo down"
                    className="btn-secondary"
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => setPan({ x: 0, y: 0 })} className="btn-secondary ml-1">
                    Center
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-faint">Markup</span>
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tool === t.id}
                  onClick={() => setTool(t.id)}
                  className="rounded-md border px-2.5 py-1 text-sm"
                  style={{
                    borderColor: tool === t.id ? "var(--brand)" : "var(--border-strong)",
                    color: tool === t.id ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {t.label}
                </button>
              ))}

              <span className="ml-2 flex items-center gap-1">
                {MARKUP_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use colour ${c}`}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full border-2"
                    style={{ backgroundColor: c, borderColor: color === c ? "var(--brand)" : "var(--border)" }}
                  />
                ))}
              </span>

              <button
                type="button"
                onClick={() => setAnnotations((prev) => prev.slice(0, -1))}
                disabled={annotations.length === 0}
                className="btn-secondary ml-auto disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => setAnnotations([])}
                disabled={annotations.length === 0}
                className="btn-secondary disabled:opacity-40"
              >
                Clear markup
              </button>
            </div>

            <p className="mt-2 text-xs text-faint">
              {tool === "move"
                ? "Drag on the photo to reposition it, or use the Position buttons above for precise nudges."
                : `Drag on the photo to draw ${tool === "arrow" ? "an arrow" : "a bubble"}.`}{" "}
              Markup is drawn with a mouse, trackpad, or touchscreen.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleSave} className="btn-primary">
                Use this photo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
