/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable strict mode for better development experience
  reactStrictMode: true,
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Experimental features for performance
  experimental: {
    // Enable server components by default
    serverComponentsExternalPackages: [],
    // Optimize CSS loading
    optimizeCss: true,
    // Enable turbo mode for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Image optimization for dashboard assets
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Internationalization for Philippines timezone
  i18n: {
    locales: ['en-PH', 'en-US'],
    defaultLocale: 'en-PH',
    domains: [
      {
        domain: 'xpress-ops-tower.com',
        defaultLocale: 'en-PH',
      },
    ],
  },

  // Optimize bundle for real-time dashboard
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize for real-time features
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/styles': path.resolve(__dirname, 'src/styles'),
    };

    // Optimize for production
    if (!dev) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          xpress: {
            name: 'xpress-design-system',
            test: /[\\/]src[\\/]components[\\/]xpress[\\/]/,
            chunks: 'all',
            priority: 10,
          },
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            chunks: 'all',
            priority: 5,
          },
        },
      };
    }

    return config;
  },

  // Headers for real-time operations
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' ? '*' : 'https://xpress-ops-tower.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'Xpress Ops Tower',
    NEXT_PUBLIC_DEFAULT_TIMEZONE: 'Asia/Manila',
  },

  // Output configuration
  output: 'standalone',
  
  // Enable TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: false,
  },
};

const path = require('path');

module.exports = nextConfig;