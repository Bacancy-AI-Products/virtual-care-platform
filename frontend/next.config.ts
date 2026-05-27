import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// Next.js only auto-loads `.env*` from the `frontend/` directory. Many setups keep one `.env`
// at the repo root (alongside `backend/`); load root first, then `frontend/` (local overrides).
const configDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(path.join(configDir, '..'));
loadEnvConfig(configDir);

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
            {
                protocol: 'https',
                hostname: 'i.pravatar.cc',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'randomuser.me',
                port: '',
                pathname: '/**',
            },
        ],
        // Serve optimised WebP/AVIF versions from Next.js image CDN
        formats: ['image/avif', 'image/webp'],
    },
};

export default nextConfig;
