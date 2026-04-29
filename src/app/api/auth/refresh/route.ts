import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, refreshTokens } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const incomingRefreshToken = cookieStore.get('refresh_token')?.value;

        if (!incomingRefreshToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // 1. Find Refresh Token (Drizzle)
        const [storedToken] = await db.select()
            .from(refreshTokens)
            .where(
                and(
                    eq(refreshTokens.token_hash, incomingRefreshToken),
                    eq(refreshTokens.revoked, false)
                )
            )
            .limit(1);

        if (!storedToken) {
            return NextResponse.json({ message: 'Invalid Refresh Token' }, { status: 403 });
        }

        // 2. Check Expiry
        if (new Date() > new Date(storedToken.expires_at)) {
            return NextResponse.json({ message: 'Refresh Token Expired' }, { status: 403 });
        }

        // 3. Get User (Drizzle)
        const [user] = await db.select()
            .from(users)
            .where(eq(users.id, storedToken.user_id))
            .limit(1);

        if (!user) {
            return NextResponse.json({ message: 'Identity Sync Failure' }, { status: 404 });
        }

        // 4. Rotation: Revoke old token, Issue new
        await db.update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.id, storedToken.id));

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
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        // 5. Set Cookies
        await setAuthCookies(newAccessToken, newRefreshToken);

        return NextResponse.json({ message: 'Token refreshed' });

    } catch (error: any) {
        console.error('Refresh Error:', error.message);
        return NextResponse.json({ message: 'Security Bridge Offline' }, { status: 500 });
    }
}
