import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { capitalAccounts, systemSettings, users } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { getValidSession } from '@/lib/capital-service';
import { createSession, getAccounts, getPositions, getHistory } from '@/lib/capital';
import { verifyAccessToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Verify JWT directly in Node runtime (more reliable than Edge middleware)
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const userId = tokenPayload.userId;

        // Fetch user from DB to get accurate name/email
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // 1. Get User Account Credentials
        const { searchParams } = new URL(request.url);
        const modeInput = searchParams.get('mode') || 'demo';

        // Find account matching mode
        let [account] = await db.select().from(capitalAccounts)
            .where(eq(capitalAccounts.user_id, userId))
            .limit(1);

        // If user has multiple accounts, we should filter by account_type
        // For now, we take the one they have, but if they have multiple, we find the best match
        const allAccounts = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId));
        account = allAccounts.find(a => a.account_type === modeInput) || allAccounts[0];

        if (!account) {
            return NextResponse.json({ message: 'No Capital.com account connected.' }, { status: 404 });
        }

        try {
            // 2. Obtain valid session (Cached or Fresh)
            const isDemo = modeInput === 'demo';
            const session = await getValidSession(userId, isDemo);

            // 3. Get Data with session tokens
            const [accountsData, positionsData, historyData] = await Promise.all([
                getAccounts(session.cst, session.xSecurityToken, isDemo),
                getPositions(session.cst, session.xSecurityToken, isDemo),
                getHistory(session.cst, session.xSecurityToken, isDemo)
            ]);

            return NextResponse.json({
                ...accountsData,
                positions: positionsData.positions || [],
                history: historyData.activities || [],
                user: {
                    fullName: user.full_name || 'Trader',
                }
            });

        } catch (err: any) {
            console.error("[Dashboard API] Capital.com Error:", err.message);

            // If session expired, we could try once more with force refresh
            if (err.message.includes("Session Expired")) {
                try {
                    const isDemo = modeInput === 'demo';
                    const session = await getValidSession(userId, isDemo, true);
                    const [accountsData, positionsData, historyData] = await Promise.all([
                        getAccounts(session.cst, session.xSecurityToken, isDemo),
                        getPositions(session.cst, session.xSecurityToken, isDemo),
                        getHistory(session.cst, session.xSecurityToken, isDemo)
                    ]);
                    return NextResponse.json({
                        ...accountsData,
                        positions: positionsData.positions || [],
                        history: historyData.activities || [],
                        user: { fullName: user.full_name || 'Trader' }
                    });
                } catch (retryErr: any) {
                    return NextResponse.json({ message: `Capital.com retry error: ${retryErr.message}` }, { status: 401 });
                }
            }

            return NextResponse.json({ message: `Capital.com error: ${err.message}` }, { status: 401 });
        }

    } catch (error: any) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
