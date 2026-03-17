import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',

    // Tree-shake barrel-style packages — reduces JS bundle size
    experimental: {
        optimizePackageImports: ['lucide-react', 'motion', '@tanstack/react-query'],
    },

    devIndicators: false,

    eslint: {
        // Prevent lint errors from failing production builds (handled separately in CI/dev)
        ignoreDuringBuilds: true,
    },

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'picsum.photos',
                port: '',
                pathname: '/**',
            },
        ],
        // Serve optimised WebP/AVIF versions from Next.js image CDN
        formats: ['image/avif', 'image/webp'],
    },
};

export default nextConfig;
