import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface JwtPayload {
    sub: string;
    role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
    iat: number;
    exp: number;
}

/**
 * Decodes a JWT payload without verifying the signature.
 * Actual signature verification happens on every backend API call.
 * This is only used for client-side routing decisions.
 */
function decodeToken(token: string): JwtPayload | null {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64)) as JwtPayload;
    } catch {
        return null;
    }
}

// Paths that don't require authentication
const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('auth-token')?.value;

    const isPublic =
        PUBLIC_PATHS.includes(pathname) ||
        pathname.startsWith('/reset-password') ||
        pathname === '/doctors' ||
        pathname.startsWith('/doctors/');

    // ── Public paths ────────────────────────────────────────────────────────────
    if (isPublic) {
        // Already logged in → redirect away from login/signup to their dashboard
        if (token && (pathname === '/login' || pathname === '/signup')) {
            const payload = decodeToken(token);
            if (payload && payload.exp > Date.now() / 1000) {
                const role = payload.role.toLowerCase();
                return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
            }
        }
        return NextResponse.next();
    }

    // ── Protected paths ─────────────────────────────────────────────────────────
    if (!token) {
        // Preserve intended destination so we can redirect back after login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    const payload = decodeToken(token);

    // Token missing, malformed, or expired
    if (!payload || payload.exp < Date.now() / 1000) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth-token');
        return response;
    }

    const role = payload.role.toLowerCase(); // "patient" | "doctor" | "admin"

    // ── Role-based access control ───────────────────────────────────────────────
    // A patient trying to access /doctor/* (or vice-versa) → send to their own section.
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
    // Run on all routes except Next.js internals and static assets
    matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|svg|ico)$).*)'],
};
