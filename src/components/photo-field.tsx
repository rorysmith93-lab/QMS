"use client";

import { useRef, useState } from "react";
import { ImageEditor } from "@/components/image-editor/image-editor";

// Drop-in replacement for a plain `<input type="file">` used for step
// photos. Picking a file opens the editor; the FLATTENED result (cropped
// to a standard shape, rotated, with any markup baked in) is what
// actually gets attached under `name` when the surrounding form submits —
// the server-side upload code doesn't need to know anything changed.
export function PhotoField({ name, label }: { name: string; label: string }) {
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const pickerInputRef = useRef<HTMLInputElement>(null);
  const submittedInputRef = useRef<HTMLInputElement>(null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setEditingFile(file);
    // Clear it so choosing the exact same file again still opens the editor.
    e.target.value = "";
  }

  function handleSave(blob: Blob) {
    const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (submittedInputRef.current) {
      submittedInputRef.current.files = dataTransfer.files;
    }
    setPreviewUrl(URL.createObjectURL(blob));
    setEditingFile(null);
  }

  return (
    <div>
      <span className="block text-sm font-medium text-[var(--text-primary)]">{label}</span>

      {previewUrl && (
        // A freshly edited local blob preview, not a remote image to optimize.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Edited photo preview"
          className="mt-2 max-h-48 rounded-md border object-contain"
          style={{ borderColor: "var(--border)" }}
        />
      )}

      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => pickerInputRef.current?.click()} className="btn-secondary">
          {previewUrl ? "Choose a different photo" : "Choose photo"}
        </button>
        {previewUrl && <span className="text-xs text-faint">Cropped &amp; formatted ✓</span>}
      </div>

      {/* Picks the original photo and opens the editor — never submitted itself. */}
      <input
        ref={pickerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handlePick}
        className="hidden"
      />
      {/* The field the surrounding form actually submits, filled in
          programmatically once editing is done. */}
      <input ref={submittedInputRef} type="file" name={name} className="hidden" tabIndex={-1} aria-hidden="true" />

      {editingFile && (
        <ImageEditor file={editingFile} onCancel={() => setEditingFile(null)} onSave={handleSave} />
      )}
    </div>
  );
}
