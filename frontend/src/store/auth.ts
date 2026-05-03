import { create } from 'zustand';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

interface AuthStore {
    token: string | null;
    user: AuthUser | null;
    login: (token: string, user: AuthUser) => void;
    logout: () => void;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 12 * 60 * 60;

function syncCookie(token: string | null): void {
    if (typeof document === 'undefined') return;
    if (token) {
        document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    } else {
        document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    }
}

export const useAuthStore = create<AuthStore>()((set) => ({
    token: null,
    user: null,

    login: (token, user) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        syncCookie(token);
        set({ token, user });
    },

    logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        syncCookie(null);
        set({ token: null, user: null });
    },
}));

export function initAuth(): void {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);

    if (!token || !raw) return;

    try {
        const user = JSON.parse(raw) as AuthUser;
        syncCookie(token);
        useAuthStore.setState({ token, user });
    } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
}
