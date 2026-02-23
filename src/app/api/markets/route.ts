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

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) {
            const secretSet = !!process.env.JWT_SECRET;
            return NextResponse.json({
                error: 'Unauthorized',
                debug: { secretSet }
            }, { status: 401 });
        }

        const userId = tokenPayload.userId;

        // Fetch user for login_id
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Get epics from query params
        const { searchParams } = new URL(request.url);
        const epicsParam = searchParams.get('epics');
        const epics = epicsParam ? epicsParam.split(',') : ['GOLD', 'OIL_CRUDE', 'EURUSD', 'BTCUSD'];

        // 1. We no longer strictly enforce the user having their own Capital account here.
        // The getValidSession method below will automatically fallback to the Master Credentials
        // if the user doesn't have their own account.
        const { searchParams: queryParams } = new URL(request.url);
        const requestMode = queryParams.get('mode') || 'demo';

        try {
            // Obtain valid session (Cached or Fresh)
            const isDemo = requestMode === 'demo';
            const session = await getValidSession(userId, isDemo);

            const marketData = await getMarketTickers(session.cst, session.xSecurityToken, epics, isDemo);
            return NextResponse.json(marketData);

        } catch (err: any) {
            const msg = err.message || 'Unknown';
            console.error('[Markets API] Capital.com Error:', msg);

            // NEVER return HTTP 401 for Capital.com errors — that signals logout to the browser.
            // Try refresh once, then return 200 with a warning.
            if (msg.includes('401') || msg.includes('unauthorized') || msg.toLowerCase().includes('session')) {
                try {
                    const isDemo = requestMode === 'demo';
                    const session = await getValidSession(userId, isDemo, true);
                    const marketData = await getMarketTickers(session.cst, session.xSecurityToken, epics, isDemo);
                    return NextResponse.json(marketData);
                } catch (retryErr: any) {
                    return NextResponse.json({ warning: `Capital.com unavailable: ${retryErr.message}` });
                }
            }

            return NextResponse.json({ warning: `Capital.com error: ${msg}` });
        }

    } catch (error: any) {
        console.error('Markets API Critical Error:', error.message);
        return NextResponse.json({
            error: `Markets Bridge Error: ${error.message}`,
            debug: { fatal: true }
        }, { status: 500 });
    }
}
