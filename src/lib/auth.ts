import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        console.warn("[Auth] WARNING: JWT_SECRET environment variable is MISSING. Falling back to internal default.");
    }
    // Using a more specific fallback to ensure parity between Edge and Node if env var is missing during deployment
    return new TextEncoder().encode(
        secret || 'mesoflix-commodity-terminal-internal-fallback-v1'
    );
}

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    tokenVersion: number;
}

/**
 * Issue a short-lived Access Token (JWT)
 */
export async function signAccessToken(payload: JWTPayload) {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h') // Increased to 1 hour to prevent clock-drift issues
        .sign(getJwtSecret());
}

/**
 * Verify Access Token
 */
export async function verifyAccessToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        return payload as unknown as JWTPayload;
    } catch (error) {
        return null; // Invalid or expired
    }
}

/**
 * Generate a random Refresh Token (Edge Compatible)
 */
export function generateRefreshToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Set Auth Cookies
 */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
    const cookieStore = await cookies();

    // Access Token Cookie
    cookieStore.set('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // Increased to 1 hour to match JWT
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
