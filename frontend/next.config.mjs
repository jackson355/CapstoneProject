/** @type {import('next').NextConfig} */
const config = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Still check TypeScript types
    ignoreBuildErrors: false,
  },
};

export default config;
