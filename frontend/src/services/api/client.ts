import { useAuthStore } from '@/store/auth';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api/v1';

export class ApiError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
        public readonly details?: unknown,
        message?: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

function getToken(): string | null {
    return useAuthStore.getState().token;
}

export async function request<T>(
    path: string,
    init: RequestInit & { params?: Record<string, string> } = {},
): Promise<T> {
    const { params, ...rest } = init;

    let url = `${API_BASE}${path}`;
    if (params && Object.keys(params).length) {
        url += `?${new URLSearchParams(params)}`;
    }

    const token = getToken();
    const res = await fetch(url, {
        ...rest,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...rest.headers,
        },
    });

    if (!res.ok) {
        if (res.status === 401) {
            useAuthStore.getState().logout();
        }
        const body = await res.json().catch(() => ({}));
        const message = body?.error?.message ?? body?.message ?? 'Request failed';
        const code = body?.error?.code ?? 'REQUEST_FAILED';
        throw new ApiError(code, res.status, body?.error?.details, message);
    }

    return res.json() as Promise<T>;
}

export async function uploadRequest<T>(path: string, form: FormData): Promise<T> {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = body?.error?.message ?? body?.message ?? 'Upload failed';
        const code = body?.error?.code ?? 'UPLOAD_FAILED';
        throw new ApiError(code, res.status, body?.error?.details, message);
    }

    return res.json() as Promise<T>;
}
