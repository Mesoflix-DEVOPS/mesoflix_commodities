import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure the app works on any domain (Render/Vercel) without hardcoding
  experimental: {
    // This helps with cross-domain prefetch issues
  }
};

export default nextConfig;
