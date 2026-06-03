import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained build in .next/standalone — required by Dockerfile.
  output: "standalone",
  experimental: {
    serverActions: {
      // Allow proxying large phone-camera photos through Server Actions (default is 1MB).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
