import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  generateBuildId: async () => {
    // Force a unique build ID for every deploy to bust Netlify CDN cache
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
