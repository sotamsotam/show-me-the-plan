import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  customWorkerSrc: 'src/worker',
  disable: process.env.NODE_ENV === 'development',
  register: process.env.NODE_ENV === 'production',
  skipWaiting: true,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  cacheStartUrl: false,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https?:\/\/.*\/api\/.*/i,
        handler: 'NetworkOnly',
      },
    ],
    navigateFallback: undefined,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

export default withPWA(nextConfig);
