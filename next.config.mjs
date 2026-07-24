import { buildSecurityHeaderRoutes } from "./src/lib/security/httpHeaders.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@edge/chart-core', '@edge/chart-react', '@edge/ai-tools-core', '@edge/indicator-runtime'],
  serverExternalPackages: ['ioredis'],
  async headers() {
    return buildSecurityHeaderRoutes(process.env.NODE_ENV === "production");
  },
};

export default nextConfig;
