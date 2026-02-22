import { db } from '@/lib/db';
import { capitalAccounts, users } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { getValidSession } from '@/lib/capital-service';
import { createSession, getMarketTickers } from '@/lib/capital';
import { verifyAccessToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const accessToken = (await cookieStore).get('access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = await verifyAccessToken(accessToken);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.userId;

        // Fetch user for login_id
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Get epics from query params
        const { searchParams } = new URL(request.url);
        const epicsParam = searchParams.get('epics');
        const epics = epicsParam ? epicsParam.split(',') : ['IX.D.GOLD.IFM.IP', 'IX.D.WTI.IFM.IP', 'EU.D.EURUSD.CASH.IP', 'BT.D.BTCUSD.CASH.IP'];

        // Get appropriate account for session
        const { searchParams: queryParams } = new URL(request.url);
        const requestMode = queryParams.get('mode') || 'demo';

        const allAccounts = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId));
        const account = allAccounts.find(a => a.account_type === requestMode) || allAccounts[0];

        if (!account) {
            return NextResponse.json({ error: 'Capital account not found' }, { status: 404 });
        }

        try {
            // Obtain valid session (Cached or Fresh)
            const isDemo = requestMode === 'demo';
            const session = await getValidSession(userId, isDemo);

            const marketData = await getMarketTickers(session.cst, session.xSecurityToken, epics, isDemo);
            return NextResponse.json(marketData);

        } catch (err: any) {
            console.error("[Markets API] Capital.com Error:", err.message);

            if (err.message.includes("Session Expired")) {
                try {
                    const isDemo = requestMode === 'demo';
                    const session = await getValidSession(userId, isDemo, true);
                    const marketData = await getMarketTickers(session.cst, session.xSecurityToken, epics, isDemo);
                    return NextResponse.json(marketData);
                } catch (retryErr: any) {
                    return NextResponse.json({ error: retryErr.message }, { status: 401 });
                }
            }

            return NextResponse.json({ error: err.message }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Markets API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
