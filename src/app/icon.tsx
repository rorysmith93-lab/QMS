// Auto-generated app icon (browser tab favicon + the icon referenced by
// manifest.ts for "Add to Home Screen"). Generated from code rather than
// a designed image file — there's no dedicated app-icon asset yet, just
// the per-company logo uploaded in Settings, which can't be used here
// since this icon has to exist before anyone's even logged in. Swap this
// out for a real designed icon whenever one exists — same file, same
// size/contentType exports, no other wiring needs to change.
import { ImageResponse } from "next/og";
import { DEFAULT_BRAND_COLOR } from "@/lib/color";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: DEFAULT_BRAND_COLOR,
        }}
      >
        {/* A checkmark drawn from plain borders + rotation rather than a
            "✓" glyph — the renderer here (Satori, via next/og) has no
            fallback font chain the way a browser does, so an unsupported
            Unicode character silently renders as a "missing glyph" box
            instead of the symbol. Shapes always render. */}
        <div
          style={{
            width: 180,
            height: 90,
            borderLeft: "36px solid #ffffff",
            borderBottom: "36px solid #ffffff",
            transform: "rotate(-45deg)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
