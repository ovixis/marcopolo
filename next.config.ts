import type { NextConfig } from "next";

// The public demo is served under a subpath (marcopolo.bookvibe.app/demo), so
// that build sets NEXT_PUBLIC_BASE_PATH=/demo to prefix routes and assets. The
// Tauri desktop build leaves it unset and serves from the bundle root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  // Tauri serves the app from a static bundle — no Node server at runtime.
  output: "export",
  images: {
    unoptimized: true,
  },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
