import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Windows CRLF + prettier/eslint otherwise fail remote builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
