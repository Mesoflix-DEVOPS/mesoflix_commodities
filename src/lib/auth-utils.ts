import { SignJWT, jwtVerify } from 'jose';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    tokenVersion: number;
}

/**
 * Get JWT Secret as Uint8Array for jose
 */
export function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error("FATAL: JWT_SECRET environment variable is required in production.");
    }
    // Using a more specific fallback to ensure parity between Edge and Node if env var is missing during development
    return new TextEncoder().encode(
        secret || 'mesoflix-commodity-terminal-internal-fallback-v1'
    );
}

/**
 * Verify Access Token (Edge Compatible)
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
 * Issue a short-lived Access Token (JWT)
 */
export async function signAccessToken(payload: JWTPayload) {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('3d')
        .sign(getJwtSecret());
}

/**
 * Generate a random Refresh Token (Edge Compatible)
 */
export function generateRefreshToken() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    // Fallback if crypto is weirdly missing
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
