import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default upload limit is 1MB, too small for real documents/PDFs.
      bodySizeLimit: "25mb",
    },
    // Because we have a proxy.ts, Next.js buffers the whole request body
    // in memory so both proxy.ts and the page can read it, and silently
    // truncates anything over its own default limit (10MB) — which was
    // corrupting file uploads before this parser ever saw them. Keep this
    // in step with serverActions.bodySizeLimit above.
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
