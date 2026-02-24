import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { capitalAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { clearCachedSession } from '@/lib/capital-service';

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { accountId } = await req.json();
        if (!accountId) return NextResponse.json({ error: 'Account ID required' }, { status: 400 });

        const userId = tokenPayload.userId;

        // Update the active account row with the selected sub-account ID
        // Note: we assume the user has at least one capital account row.
        // We update the 'is_active' row for that user.
        await db.update(capitalAccounts)
            .set({
                selected_capital_account_id: accountId,
                updated_at: new Date()
            })
            .where(and(eq(capitalAccounts.user_id, userId), eq(capitalAccounts.is_active, true)));

        // Invalidate session cache to ensure the next request picks up the fresh account preference
        await clearCachedSession(userId, true);
        await clearCachedSession(userId, false);

        return NextResponse.json({ success: true, accountId });

    } catch (err: any) {
        console.error('[Select Account API] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
