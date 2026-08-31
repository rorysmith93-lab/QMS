// Web App Manifest — what makes "Add to Home Screen" behave like an app
// (full-screen, its own icon/name) rather than just a bookmark. iOS Safari
// reads this alongside the apple-icon.tsx-generated <link rel="apple-
// touch-icon"> for the home-screen icon specifically.
import type { MetadataRoute } from "next";
import { DEFAULT_BRAND_COLOR } from "@/lib/color";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QMS Rapid",
    short_name: "QMS Rapid",
    description: "Quality Management System for small manufacturers",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: DEFAULT_BRAND_COLOR,
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
