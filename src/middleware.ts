import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

const PROTECTED_ROUTES = ['/dashboard', '/api/user', '/api/dashboard', '/api/capital'];
const PUBLIC_ROUTES = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Check if route is protected
    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

    if (!isProtected) {
        return NextResponse.next();
    }

    // 2. Get Access Token
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
        // Build login URL with return path
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 3. Verify Token
    const payload = await verifyAccessToken(accessToken);

    if (!payload) {
        // Token invalid/expired - Redirect to login
        // In a SPA, we might want to return 401 for API routes so frontend can try refresh
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 4. Token valid - Proceed
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId);
    response.headers.set('x-user-role', payload.role || 'user');

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|public).*)',
    ],
};
