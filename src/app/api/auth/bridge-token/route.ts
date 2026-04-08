import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken, signAccessToken } from '@/lib/auth';
import { SignJWT } from 'jose';

export const dynamic = 'force-dynamic';

/**
 * Bridge Token Issuer
 * Provides a short-lived (5-minute) JWT for client-side WebSocket/Bridge communication.
 * This allows the main access_token to remain httpOnly: true.
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyAccessToken(accessToken);
        if (!payload) {
            return NextResponse.json({ error: 'Session expired' }, { status: 401 });
        }

        // Issue a short-lived token specifically for the bridge
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'mesoflix-commodity-terminal-internal-fallback-v1');
        
        const bridgeToken = await new SignJWT({ 
            userId: payload.userId, 
            email: payload.email, 
            role: payload.role 
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('5m')
            .sign(secret);

        return NextResponse.json({ bridgeToken });

    } catch (error: any) {
        console.error('[Bridge Token] Generation Failure:', error.message);
        return NextResponse.json({ error: 'Identity Bridge Offline' }, { status: 500 });
    }
}
