"use client";

import { useRef, useState } from "react";

const OUTPUT_SIZE = 800; // square, px

type Status = "idle" | "removing" | "error";

// Composites a (possibly transparent) image onto a plain white square,
// centred and scaled to fit with a little breathing room — the classic
// "product shot" look.
function compositeOnWhite(image: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const margin = OUTPUT_SIZE * 0.08;
    const maxSize = OUTPUT_SIZE - margin * 2;
    const scale = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.drawImage(image, (OUTPUT_SIZE - w) / 2, (OUTPUT_SIZE - h) / 2, w, h);

    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not export image"))),
      "image/jpeg",
      0.92
    );
  });
}

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

export function EquipmentPhotoField({
  name,
  currentImageUrl,
}: {
  name: string;
  currentImageUrl?: string | null;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const submittedInputRef = useRef<HTMLInputElement>(null);
  const lastPickedFile = useRef<File | null>(null);

  function attach(blob: Blob) {
    const file = new File([blob], "equipment.jpg", { type: "image/jpeg" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (submittedInputRef.current) {
      submittedInputRef.current.files = dataTransfer.files;
    }
    setPreviewUrl(URL.createObjectURL(blob));
  }

  async function processFile(file: File) {
    lastPickedFile.current = file;
    setStatus("removing");
    setErrorMessage(null);
    try {
      // Loaded on demand — this pulls in a sizeable ML model (tens of MB,
      // cached by the browser after the first use), so we don't want it
      // in the main app bundle.
      const { removeBackground } = await import("@imgly/background-removal");
      const cutout = await removeBackground(file, {
        model: "isnet_quint8", // the smallest of the available models
        output: { format: "image/png" },
      });
      const image = await loadImage(cutout);
      const composited = await compositeOnWhite(image);
      attach(composited);
      setStatus("idle");
    } catch (err) {
      console.error("Background removal failed:", err);
      setErrorMessage(
        "Couldn't automatically remove the background (this can happen offline, or in some browsers)."
      );
      setStatus("error");
    }
  }

  async function useOriginalInstead() {
    const file = lastPickedFile.current;
    if (!file) return;
    try {
      const image = await loadImage(file);
      const composited = await compositeOnWhite(image);
      attach(composited);
      setStatus("idle");
      setErrorMessage(null);
    } catch {
      setErrorMessage("Couldn't read that photo. Try a different file.");
    }
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) processFile(file);
  }

  return (
    <div>
      <span className="block text-sm font-medium text-[var(--text-primary)]">Photo</span>

      {(previewUrl || currentImageUrl) && (
        // Local blob preview / already-signed URL, not something to optimize.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl ?? currentImageUrl ?? undefined}
          alt="Equipment preview on white background"
          className="mt-2 h-32 w-32 rounded-md border object-contain"
          style={{ borderColor: "var(--border)", backgroundColor: "#fff" }}
        />
      )}

      {status === "removing" && (
        <p role="status" className="mt-2 text-sm text-muted">
          Removing background… this can take a little while the first time.
        </p>
      )}

      {status === "error" && errorMessage && (
        <div className="mt-2 space-y-2">
          <p role="alert" className="banner-error">
            {errorMessage}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => lastPickedFile.current && processFile(lastPickedFile.current)}
              className="btn-secondary"
            >
              Try again
            </button>
            <button type="button" onClick={useOriginalInstead} className="btn-secondary">
              Use original photo instead
            </button>
          </div>
        </div>
      )}

      <div className="mt-2">
        <button
          type="button"
          onClick={() => pickerRef.current?.click()}
          disabled={status === "removing"}
          className="btn-secondary disabled:opacity-50"
        >
          {previewUrl || currentImageUrl ? "Choose a different photo" : "Choose photo"}
        </button>
      </div>

      <input
        ref={pickerRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handlePick}
        className="hidden"
      />
      <input ref={submittedInputRef} type="file" name={name} className="hidden" tabIndex={-1} aria-hidden="true" />
    </div>
  );
}
