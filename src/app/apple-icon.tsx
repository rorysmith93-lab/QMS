// Dedicated iOS home-screen icon (the standard 180x180 apple-touch-icon
// size). Same placeholder mark as icon.tsx, rendered full-bleed with no
// rounding or transparency baked in — iOS applies its own rounded-square
// mask on top, so a square, opaque source image is what Apple recommends.
import { ImageResponse } from "next/og";
import { DEFAULT_BRAND_COLOR } from "@/lib/color";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        {/* Same checkmark as icon.tsx, scaled down — see that file for
            why it's drawn from borders rather than a "✓" glyph. */}
        <div
          style={{
            width: 63,
            height: 32,
            borderLeft: "13px solid #ffffff",
            borderBottom: "13px solid #ffffff",
            transform: "rotate(-45deg)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
