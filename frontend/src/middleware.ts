import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose/jwt/verify';

interface JwtPayload {
    sub: string;
    role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

/** Decode payload without verifying signature (routing hints only). Used when JWT_SECRET is not available to Edge. */
function decodeTokenUnsafe(token: string): JwtPayload | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(atob(base64)) as {
            sub?: unknown;
            role?: unknown;
            exp?: unknown;
        };
        if (typeof json.exp !== 'number' || json.exp < Date.now() / 1000) return null;
        const sub =
            typeof json.sub === 'string' ? json.sub : json.sub != null ? String(json.sub) : '';
        const role = json.role;
        if (!sub || (role !== 'PATIENT' && role !== 'DOCTOR' && role !== 'ADMIN')) {
            return null;
        }
        return { sub, role };
    } catch {
        return null;
    }
}

/**
 * Verifies JWT when JWT_SECRET is present (HS256). Otherwise decodes payload only — same trade-off as before signature checks:
 * API remains authoritative; this only gates Next routes when Edge cannot see repo-root env.
 */
async function verifyToken(token: string): Promise<JwtPayload | null> {
    const secret = process.env.JWT_SECRET;
    if (secret) {
        try {
            const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
                algorithms: ['HS256'],
            });

            const sub =
                typeof payload.sub === 'string'
                    ? payload.sub
                    : payload.sub != null
                      ? String(payload.sub)
                      : '';
            const role = payload.role;

            if (!sub || (role !== 'PATIENT' && role !== 'DOCTOR' && role !== 'ADMIN')) {
                return null;
            }

            return { sub, role };
        } catch {
            return null;
        }
    }

    return decodeTokenUnsafe(token);
}

const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password', '/privacy', '/terms'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('auth-token')?.value;

    const isPublic =
        PUBLIC_PATHS.includes(pathname) ||
        pathname.startsWith('/reset-password') ||
        pathname === '/doctors' ||
        pathname.startsWith('/doctors/');

    if (isPublic) {
        if (token && (pathname === '/login' || pathname === '/signup')) {
            const payload = await verifyToken(token);
            if (payload) {
                const role = payload.role.toLowerCase();
                return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
            }
        }
        return NextResponse.next();
    }

    if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(token);

    if (!payload) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth-token');
        return response;
    }

    const role = payload.role.toLowerCase();

    if (pathname.startsWith('/patient') && role !== 'patient') {
        return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
    }
    if (pathname.startsWith('/doctor') && role !== 'doctor') {
        return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
    }
    if (pathname.startsWith('/admin') && role !== 'admin') {
        return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|svg|ico)$).*)'],
};
