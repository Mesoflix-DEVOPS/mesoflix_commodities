import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, refreshTokens, auditLogs } from '@/lib/db/schema';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const incomingRefreshToken = cookieStore.get('refresh_token')?.value;

        if (!incomingRefreshToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // 1. Find Refresh Token in DB
        const [storedToken] = await db.select().from(refreshTokens)
            .where(and(
                eq(refreshTokens.token_hash, incomingRefreshToken),
                eq(refreshTokens.revoked, false)
            ))
            .limit(1);

        if (!storedToken) {
            // Reuse Detection typically happens here
            return NextResponse.json({ message: 'Invalid Refresh Token' }, { status: 403 });
        }

        // 2. Check Expiry
        if (new Date() > storedToken.expires_at) {
            return NextResponse.json({ message: 'Refresh Token Expired' }, { status: 403 });
        }

        // 3. Get User
        const [user] = await db.select().from(users).where(eq(users.id, storedToken.user_id)).limit(1);

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // 4. Rotation: Revoke old token, Issue new
        await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, storedToken.id));

        const newAccessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
            tokenVersion: user.token_version || 0,
        });

        const newRefreshToken = generateRefreshToken();

        await db.insert(refreshTokens).values({
            user_id: user.id,
            token_hash: newRefreshToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        // 5. Set Cookies
        await setAuthCookies(newAccessToken, newRefreshToken);

        // 6. Audit Log
        await db.insert(auditLogs).values({
            user_id: user.id,
            action: 'REFRESH_TOKEN',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json({ message: 'Token refreshed' });

    } catch (error: any) {
        console.error('Refresh Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
