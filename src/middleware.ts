import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

// Only protect page routes here. API routes handle their own auth in Node runtime.
const PROTECTED_ROUTES = ['/dashboard'];
const PUBLIC_ROUTES = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

export async function middleware(request: NextRequest) {
    try {
        const { pathname } = request.nextUrl;

        // 1. Check if route is protected
        const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

        if (!isProtected) {
            return NextResponse.next();
        }

        // 2. Get Tokens
        const accessToken = request.cookies.get('access_token')?.value;
        const refreshToken = request.cookies.get('refresh_token')?.value;

        if (!accessToken && !refreshToken) {
            // Build login URL with return path
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('from', pathname);
            loginUrl.searchParams.set('debug', 'missing_cookie');
            return NextResponse.redirect(loginUrl);
        }

        // 3. Verify Token
        let payload = null;
        if (accessToken) {
            payload = await verifyAccessToken(accessToken);
        }

        if (!payload && !refreshToken) {
            // Token invalid/expired - Redirect to login
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
            }

            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('from', pathname);
            loginUrl.searchParams.set('debug', 'invalid_token');
            loginUrl.searchParams.set('hint', accessToken?.substring(0, 10) || 'no_token');
            return NextResponse.redirect(loginUrl);
        }

        // 4. Token valid or defer to client - Proceed
        const response = NextResponse.next();
        if (payload) {
            response.headers.set('x-user-id', payload.userId);
            response.headers.set('x-user-role', payload.role || 'user');
        }

        // CRITICAL: Prevent browser from caching dashboard pages.
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        return response;
    } catch (error: any) {
        console.error('[Middleware] Fatal Error:', error);
        return NextResponse.json({
            message: 'Middleware Error',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - favicon.svg (favicon file)
         * - public/ folder
         * - files with extensions (e.g. .js, .css, .png)
         */
        '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|public|.*\\..*).*)',
    ],
};
