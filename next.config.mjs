// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Don’t fail Vercel builds on ESLint issues
  eslint: {
    ignoreDuringBuilds: true,
  },

  // (Optional) If type errors sometimes block CI, you can enable this too:
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

export default nextConfig;
