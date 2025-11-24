import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  experimental: {
    // Increase the body size limit for API routes to handle large telemetry CSV files
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
};

export default nextConfig;
