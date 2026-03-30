import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@swarmrecall/shared'],
};

export default nextConfig;
