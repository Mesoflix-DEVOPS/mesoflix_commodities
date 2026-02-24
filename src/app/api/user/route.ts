import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Lightweight user identity endpoint.
 * Returns current user info from DB — does NOT call Capital.com.
 * Used by the dashboard layout to identify the user without depending
 * on trading APIs being available.
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = await verifyAccessToken(accessToken);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [user] = await db.select({
            id: users.id,
            email: users.email,
            full_name: users.full_name,
            role: users.role,
            two_factor_enabled: users.two_factor_enabled,
        }).from(users).where(eq(users.id, payload.userId)).limit(1);

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                two_factor_enabled: user.two_factor_enabled,
            }
        });
    } catch (err: any) {
        console.error('[User API] Error:', err.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
