import { cookies } from 'next/headers';
import {
    getJwtSecret,
    verifyAccessToken,
    signAccessToken,
    generateRefreshToken,
    type JWTPayload
} from './auth-utils';

export {
    getJwtSecret,
    verifyAccessToken,
    signAccessToken,
    generateRefreshToken,
    type JWTPayload
};

/**
 * Set Auth Cookies
 */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
    const cookieStore = await cookies();

    // Access Token Cookie: Unlocked for the Institutional Bridge
    cookieStore.set('access_token', accessToken, {
        httpOnly: false, // Allow client-side extraction to facilitate Render bridge 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3 * 24 * 60 * 60, // 3 days
        path: '/',
    });

    // Refresh Token Cookie
    cookieStore.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3 * 24 * 60 * 60, // 3 days
        path: '/',
    });

}

/**
 * Clear Auth Cookies (Logout)
 */
export async function clearAuthCookies() {
    const cookieStore = await cookies();
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
}

/**
 * Get Current Auth Session for Server Components and APIs
 */
export async function auth() {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return null;

        const payload = await verifyAccessToken(accessToken);
        if (!payload) return null;

        return {
            user: {
                id: payload.userId,
                email: payload.email,
                role: payload.role,
            }
        };
    } catch (e) {
        return null;
    }
}
