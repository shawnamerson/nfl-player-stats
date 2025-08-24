// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ This prevents Next.js from failing the production build on ESLint issues
    ignoreDuringBuilds: true,
  },

  // Optional: if TS type errors also block CI sometimes, uncomment:
  // typescript: { ignoreBuildErrors: true },
};

// This log helps you verify the config is actually loaded during Vercel builds
console.log("[next.config.ts] eslint.ignoreDuringBuilds:", nextConfig.eslint?.ignoreDuringBuilds);

export default nextConfig;
