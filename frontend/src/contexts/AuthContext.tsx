// Auth state is now managed by Zustand (src/store/auth.ts).
// This file is kept so any existing imports keep resolving.
export { useAuth } from '@/hooks/useAuth';
export type { AuthUser } from '@/store/auth';
