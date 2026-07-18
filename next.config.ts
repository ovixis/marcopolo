import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tauri serves the app from a static bundle — no Node server at runtime.
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
