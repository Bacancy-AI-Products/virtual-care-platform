import { request } from './client';
import type { AuthUser } from '@/store/auth';

export type { AuthUser };

export interface AuthResult {
    token: string;
    user: AuthUser;
}

export const authApi = {
    login: (email: string, password: string) =>
        request<AuthResult>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    logout: () =>
        request<void>('/auth/logout', {
            method: 'POST',
        }),

    signup: (data: { name: string; email: string; password: string; role: 'PATIENT' | 'DOCTOR' }) =>
        request<AuthResult>(`/auth/signup/${data.role.toLowerCase()}`, {
            method: 'POST',
            body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
        }),

    forgotPassword: (email: string) =>
        request<{ message: string }>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    resetPassword: (token: string, newPassword: string) =>
        request<{ message: string }>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        }),
};
