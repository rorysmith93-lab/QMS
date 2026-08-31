"use client";

import { useRef, useState } from "react";

type Status = "idle" | "processing" | "error";

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    img.src = url;
  });
}

// Crops away any fully-transparent border around the artwork — a lot of
// exported logo PNGs carry a large margin of empty canvas around the mark
// itself, which is invisible on its own but means the logo renders tiny
// once it's placed in a small square slot (sidebar, document header),
// since object-contain has to fit that whole empty margin too. Trimming
// it means the same display box shows the actual mark much bigger.
function trimTransparentPadding(image: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }
    ctx.drawImage(image, 0, 0);

    const { width, height } = canvas;
    const { data } = ctx.getImageData(0, 0, width, height);
    const ALPHA_THRESHOLD = 10;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Nothing found (a fully transparent file, or no alpha channel at
    // all) — export as-is rather than guessing.
    if (maxX < 0) {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not export image"))), "image/png");
      return;
    }

    // A small margin so the crop isn't razor-tight against the artwork.
    const margin = Math.round(Math.max(width, height) * 0.02);
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(width - 1, maxX + margin);
    maxY = Math.min(height - 1, maxY + margin);

    const trimmedWidth = maxX - minX + 1;
    const trimmedHeight = maxY - minY + 1;

    // No meaningful padding to remove — skip the extra canvas.
    if (trimmedWidth === width && trimmedHeight === height) {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not export image"))), "image/png");
      return;
    }

    const trimmed = document.createElement("canvas");
    trimmed.width = trimmedWidth;
    trimmed.height = trimmedHeight;
    const trimmedCtx = trimmed.getContext("2d");
    if (!trimmedCtx) {
      reject(new Error("Canvas not supported"));
      return;
    }
    trimmedCtx.drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
    trimmed.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not export image"))), "image/png");
  });
}

// Only PNG/WebP can carry real transparency worth trimming — JPEGs have
// no alpha channel (canvas reports every pixel opaque), and SVGs are
// vector, already cropped to their own viewBox by whatever authored them,
// and shouldn't be rasterized just to check.
function isTrimmable(file: File) {
  return file.type === "image/png" || file.type === "image/webp";
}

export function LogoUploadField({ name, currentImageUrl }: { name: string; currentImageUrl?: string | null }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const submittedInputRef = useRef<HTMLInputElement>(null);

  function attach(blob: Blob, fileName: string) {
    const file = new File([blob], fileName, { type: blob.type });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (submittedInputRef.current) {
      submittedInputRef.current.files = dataTransfer.files;
    }
    setPreviewUrl(URL.createObjectURL(blob));
  }

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isTrimmable(file)) {
      attach(file, file.name);
      setStatus("idle");
      setErrorMessage(null);
      return;
    }

    setStatus("processing");
    setErrorMessage(null);
    try {
      const image = await loadImage(file);
      const trimmed = await trimTransparentPadding(image);
      attach(trimmed, file.name.replace(/\.\w+$/, ".png"));
      setStatus("idle");
    } catch (err) {
      console.error("Logo trim failed:", err);
      // Fall back to the original file rather than blocking the upload —
      // a slightly-padded logo is better than none at all.
      attach(file, file.name);
      setErrorMessage("Couldn't automatically trim the logo's padding — uploaded as-is.");
      setStatus("error");
    }
  }

  const pickerId = `${name}-picker`;

  return (
    <div>
      <label htmlFor={pickerId} className="block text-sm font-medium text-[var(--text-primary)]">
        {currentImageUrl ? "Replace logo" : "Upload a logo"}
      </label>

      {(previewUrl || currentImageUrl) && (
        <div className="mt-2 flex items-center gap-3">
          {/* Local blob preview / already-signed URL — not something to
              optimize via next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl ?? currentImageUrl ?? undefined}
            alt="Logo preview"
            className="h-24 max-w-[240px] object-contain"
          />
          <span className="text-sm text-muted">{previewUrl ? "New logo" : "Current logo"}</span>
        </div>
      )}

      {status === "processing" && <p className="mt-2 text-sm text-muted">Trimming empty space around the logo…</p>}
      {status === "error" && errorMessage && (
        <p role="alert" className="mt-2 banner-caution">
          {errorMessage}
        </p>
      )}

      <input
        id={pickerId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handlePick}
        className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-hover)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--text-primary)] hover:file:opacity-80"
      />
      <p className="mt-1 text-xs text-faint">PNG, JPEG, WebP, or SVG.</p>
      <input ref={submittedInputRef} type="file" name={name} className="hidden" tabIndex={-1} aria-hidden="true" />
    </div>
  );
}
