'use client';

import { initAuth } from '@/store/auth';

/**
 * Hydrates Zustand auth state from localStorage synchronously at module-load
 * time — before React's first render — so token/user are available immediately
 * and queries don't need a double-render cycle to become enabled.
 */
if (typeof window !== 'undefined') {
    initAuth();
}

export function AuthBootstrap() {
    return null;
}
