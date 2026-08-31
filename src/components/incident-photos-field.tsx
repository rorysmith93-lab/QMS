"use client";

import { useState } from "react";

// Multiple raw photo attachments for an incident report — deliberately NOT
// routed through the step-photo ImageEditor (src/components/photo-field.tsx):
// these are evidence, so they're kept as-shot rather than cropped/edited.
// A native multi-file input works with no JS at all; this just adds
// thumbnail previews on top.
export function IncidentPhotosField({ name, label }: { name: string; label: string }) {
  const [previews, setPreviews] = useState<string[]>([]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        onChange={handleChange}
        className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-hover)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--text-primary)] hover:file:opacity-80"
      />
      {previews.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {previews.map((url, i) => (
            // Freshly picked local blob previews, not remote images to optimize.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt=""
              className="h-16 w-16 rounded-md border object-cover"
              style={{ borderColor: "var(--border)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
