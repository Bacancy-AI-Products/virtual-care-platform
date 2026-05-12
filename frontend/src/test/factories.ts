/**
 * Tiny frontend test factories — same convention as the backend.
 */
import type { AuthUser } from '@/store/auth';

let counter = 0;
const uniq = () => ++counter;

export const anAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => {
    const n = uniq();
    return {
        id: `user-${n}`,
        name: `Test User ${n}`,
        email: `test.user.${n}@telecare.local`,
        role: 'PATIENT',
        ...overrides,
    };
};
