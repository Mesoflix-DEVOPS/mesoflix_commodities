import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Public debug endpoint — diagnoses JWT / cookie issues without needing auth
export async function GET(request: Request) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    // Check env vars
    const jwtSecret = process.env.JWT_SECRET;
    const encKey = process.env.CAPITAL_ENCRYPTION_KEY;
    const dbUrl = process.env.DATABASE_URL;

    // Try to decode JWT header + payload (no verification, just decode)
    let tokenInfo: any = null;
    if (accessToken) {
        try {
            const parts = accessToken.split('.');
            if (parts.length === 3) {
                const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                tokenInfo = {
                    header,
                    payload: {
                        ...payload,
                        exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
                        iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
                    },
                    isExpired: payload.exp ? Date.now() / 1000 > payload.exp : false,
                };
            }
        } catch (e: any) {
            tokenInfo = { error: e.message };
        }
    }

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        cookies: {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenLength: accessToken?.length,
            accessTokenPrefix: accessToken?.substring(0, 20),
        },
        env: {
            JWT_SECRET_SET: !!jwtSecret,
            JWT_SECRET_LENGTH: jwtSecret?.length || 0,
            JWT_SECRET_PREFIX: jwtSecret?.substring(0, 10) || 'MISSING',
            CAPITAL_ENCRYPTION_KEY_SET: !!encKey,
            DATABASE_URL_SET: !!dbUrl,
            NODE_ENV: process.env.NODE_ENV,
        },
        tokenInfo,
    });
}
