import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // spotted/ is nested inside a larger repo with its own lockfile; pin tracing
  // here so `next build` stops warning about workspace-root inference.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
