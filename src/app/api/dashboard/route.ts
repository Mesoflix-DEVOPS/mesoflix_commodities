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
            const secretSet = !!process.env.JWT_SECRET;
            const tokenLen = accessToken?.length || 0;
            console.error(`[Dashboard API] Unauthorized: JWT verification failed. Secret: ${secretSet}, Token Len: ${tokenLen}`);
            return NextResponse.json({
                message: 'Unauthorized: Session Invalid',
                debug: { secretSet, tokenLen }
            }, { status: 401 });
        }

        const userId = tokenPayload.userId;

        // Fetch user from DB to get accurate name/email
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // 1. We no longer strictly enforce the user having their own Capital account here.
        // The getValidSession method below will automatically fallback to the Master Credentials
        // if the user doesn't have their own account.
        const { searchParams } = new URL(request.url);
        const modeInput = searchParams.get('mode') || 'demo';

        // 4. Identity Buffer (Ensures user name is returned even if trading fetch fails)
        const userData = {
            fullName: user.full_name || 'Trader',
        };

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

            const activities = historyData.activities || [];
            return NextResponse.json({
                ...accountsData,
                accounts: (accountsData.accounts || []).map((a: any) => ({
                    ...a,
                    balance: {
                        ...a.balance,
                        availableToWithdraw: a.balance?.available,
                        equity: (a.balance?.balance ?? 0) + (a.balance?.profitLoss ?? 0),
                    }
                })),
                positions: positionsData.positions || [],
                history: activities,  // Capital.com: { activities: [...] }
                user: userData
            });

        } catch (err: any) {
            console.error("[Dashboard API] Capital.com Error:", err.message);

            // If session expired or unauthorized, we could try once more with force refresh
            if (err.message.includes("Session Expired") || err.message.includes("401") || err.message.includes("unauthorized")) {
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
                        user: userData
                    });
                } catch (retryErr: any) {
                    return NextResponse.json({
                        accounts: [], positions: [], history: [],
                        error: `Capital.com connectivity failed: ${retryErr.message}`,
                        user: userData
                    }); // Return 200 to prevent frontend crash
                }
            }

            return NextResponse.json({
                accounts: [], positions: [], history: [],
                error: `Capital.com error: ${err.message}`,
                user: userData
            });
        }

    } catch (error: any) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
