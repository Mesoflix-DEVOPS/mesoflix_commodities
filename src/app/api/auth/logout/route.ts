import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { refreshTokens, auditLogs } from '@/lib/db/schema';
import { clearAuthCookies, verifyAccessToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get('refresh_token')?.value;
        const accessToken = cookieStore.get('access_token')?.value;

        // Revoke token if present
        if (refreshToken) {
            await db.update(refreshTokens)
                .set({ revoked: true })
                .where(eq(refreshTokens.token_hash, refreshToken));
        }

        // Audit Log (try to get user ID from access token if Valid)
        if (accessToken) {
            // We decode but ignore expiration for logging logout
            // verifyAccessToken might fail if expired, but that's okay.
        }

        await clearAuthCookies();

        return NextResponse.json({ message: 'Logged out successfully' });

    } catch (error: any) {
        console.error('Logout Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
