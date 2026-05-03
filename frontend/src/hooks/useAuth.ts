// Canonical auth hook — backed by Zustand with localStorage + cookie persistence.
// All components import from here so imports never need to change.
export type { AuthUser } from '@/store/auth';
export { useAuthStore as useAuth } from '@/store/auth';
