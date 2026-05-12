/**
 * Demo: Zustand store test. Pure logic — no MSW, no fetch, no RTL.
 *
 * The store is the source of truth for auth state across the app; if it
 * regresses, every protected route breaks. Worth covering directly.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore, initAuth } from './auth';
import { anAuthUser } from '@/test/factories';

beforeEach(() => {
    // Fresh state between tests — Zustand stores are module singletons.
    useAuthStore.setState({ token: null, user: null });
    localStorage.clear();
    document.cookie = 'auth-token=; path=/; max-age=0';
});

describe('useAuthStore.login', () => {
    it('writes token + user to state, localStorage, and cookie', () => {
        const user = anAuthUser();

        useAuthStore.getState().login('jwt-abc', user);

        const state = useAuthStore.getState();
        expect(state.token).toBe('jwt-abc');
        expect(state.user).toEqual(user);
        expect(localStorage.getItem('auth_token')).toBe('jwt-abc');
        expect(document.cookie).toContain('auth-token=jwt-abc');
    });
});

describe('useAuthStore.logout', () => {
    it('clears state, localStorage, and cookie', () => {
        const user = anAuthUser();
        useAuthStore.getState().login('jwt-abc', user);

        useAuthStore.getState().logout();

        const state = useAuthStore.getState();
        expect(state.token).toBeNull();
        expect(state.user).toBeNull();
        expect(localStorage.getItem('auth_token')).toBeNull();
        expect(document.cookie).not.toContain('jwt-abc');
    });
});

describe('initAuth', () => {
    it('rehydrates state from localStorage when both token and user are present', () => {
        const user = anAuthUser();
        localStorage.setItem('auth_token', 'jwt-stored');
        localStorage.setItem('auth_user', JSON.stringify(user));

        initAuth();

        expect(useAuthStore.getState().token).toBe('jwt-stored');
        expect(useAuthStore.getState().user).toEqual(user);
    });

    it('does nothing when storage is empty', () => {
        initAuth();
        expect(useAuthStore.getState().token).toBeNull();
    });

    it('clears storage on malformed user JSON', () => {
        localStorage.setItem('auth_token', 'jwt-stored');
        localStorage.setItem('auth_user', 'not-json{');

        initAuth();

        expect(localStorage.getItem('auth_token')).toBeNull();
        expect(localStorage.getItem('auth_user')).toBeNull();
    });
});
