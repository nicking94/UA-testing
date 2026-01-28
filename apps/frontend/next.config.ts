import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 180,
  experimental: {
    webpackBuildWorker: true,
  },
};
export default nextConfig;
