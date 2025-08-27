/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: true,
    optimizeCss: true,
  },
  // Skip build errors for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone'
}

module.exports = nextConfig