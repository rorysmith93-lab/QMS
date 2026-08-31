"use client";

import { useId, useState } from "react";
import { isReadableWithWhiteText, isValidHexColor } from "@/lib/color";

// A colour picker + hex text field kept in sync, with a live accessibility
// check: if the chosen colour would make white button text hard to read,
// we warn right away instead of letting someone publish an unreadable UI.
export function BrandColorField({ defaultValue }: { defaultValue: string }) {
  const [color, setColor] = useState(defaultValue);
  const pickerId = useId();
  const hexId = useId();

  const valid = isValidHexColor(color);
  const readable = valid && isReadableWithWhiteText(color);

  return (
    <div>
      <label htmlFor={hexId} className="block text-sm font-medium text-[var(--text-primary)]">
        Brand colour
      </label>
      <div className="mt-1 flex items-center gap-3">
        <input
          id={pickerId}
          type="color"
          value={valid ? color : "#5E6ACD"}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Pick brand colour"
          className="h-9 w-12 cursor-pointer rounded border p-1"
          style={{ borderColor: "var(--border-strong)", backgroundColor: "var(--surface)" }}
        />
        <input
          id={hexId}
          name="primaryColor"
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          pattern="^#[0-9a-fA-F]{6}$"
          required
          className="field max-w-[10rem]"
        />
        <button
          type="button"
          className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold"
          style={{ backgroundColor: valid ? color : "#5E6ACD", color: "#fff" }}
        >
          Sample button
        </button>
      </div>

      {valid && !readable && (
        <p role="alert" className="banner-caution mt-2">
          This colour is quite light — white text on buttons may be hard to read. Consider
          something darker for better accessibility.
        </p>
      )}
      {!valid && color.length > 0 && (
        <p role="alert" className="banner-error mt-2">
          Enter a colour as a hex code, e.g. #5E6ACD.
        </p>
      )}
    </div>
  );
}
