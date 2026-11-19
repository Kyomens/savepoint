/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '6mb' },
  },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
