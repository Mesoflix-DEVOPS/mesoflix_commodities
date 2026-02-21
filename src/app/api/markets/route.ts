import { db } from '@/lib/db';
import { capitalAccounts, users } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
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

        const apiKey = decrypt(account.encrypted_api_key);
        const apiPassword = account.encrypted_api_password ? decrypt(account.encrypted_api_password) : null;

        if (!apiPassword) return NextResponse.json({ error: 'Password missing' }, { status: 400 });

        // Session creation
        const isDemo = account.account_type === 'demo';
        const session = await createSession(user.email, apiPassword, apiKey, isDemo);

        const marketData = await getMarketTickers(session.cst, session.xSecurityToken, epics, isDemo);

        return NextResponse.json(marketData);

    } catch (error: any) {
        console.error('Markets API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
