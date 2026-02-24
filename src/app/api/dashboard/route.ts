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
            const isDemo = modeInput === 'demo';
            const session = await getValidSession(userId, isDemo);
            // Use the account's actual endpoint, not just the frontend mode
            const apiIsDemo = session.accountIsDemo ?? isDemo;

            // 3. Get Data with session tokens
            const [accountsData, positionsData, historyData] = await Promise.all([
                getAccounts(session.cst, session.xSecurityToken, apiIsDemo),
                getPositions(session.cst, session.xSecurityToken, apiIsDemo),
                getHistory(session.cst, session.xSecurityToken, apiIsDemo)
            ]);

            const accounts = (accountsData.accounts || []).map((a: any) => ({
                ...a,
                balance: {
                    ...(a.balance || {}),
                    availableToWithdraw: a.balance?.available ?? a.balance?.availableToWithdraw ?? 0,
                    equity: (a.balance?.balance ?? 0) + (a.balance?.profitLoss ?? 0),
                }
            }));

            const activities = historyData?.activities || [];
            return NextResponse.json({
                ...accountsData,
                accounts,
                positions: positionsData?.positions || [],
                history: activities,
                user: userData
            });

        } catch (err: any) {
            const msg = err.message || 'Unknown error';
            console.error('[Dashboard API] Capital.com Error:', msg);

            // CRITICAL: Capital.com errors must NEVER return 401 to the browser.
            // HTTP 401 signals "not authenticated" and triggers logout/redirect.
            // Capital.com connectivity issues should be 503 (Service Unavailable).
            // We return 200 with empty arrays so the dashboard renders gracefully.

            // If the session token itself is stale, try a force-refresh once
            if (msg.includes('401') || msg.includes('unauthorized') || msg.toLowerCase().includes('session')) {
                try {
                    const isDemo2 = modeInput === 'demo';
                    const session = await getValidSession(userId, isDemo2, true);
                    const apiIsDemo2 = session.accountIsDemo ?? isDemo2;
                    const [accountsData, positionsData, historyData] = await Promise.all([
                        getAccounts(session.cst, session.xSecurityToken, apiIsDemo2),
                        getPositions(session.cst, session.xSecurityToken, apiIsDemo2),
                        getHistory(session.cst, session.xSecurityToken, apiIsDemo2)
                    ]);
                    const accounts = (accountsData.accounts || []).map((a: any) => ({
                        ...a,
                        balance: {
                            ...(a.balance || {}),
                            availableToWithdraw: a.balance?.available ?? a.balance?.availableToWithdraw ?? 0,
                            equity: (a.balance?.balance ?? 0) + (a.balance?.profitLoss ?? 0),
                        }
                    }));
                    const activities = historyData?.activities || [];
                    return NextResponse.json({
                        ...accountsData,
                        accounts,
                        positions: positionsData?.positions || [],
                        history: activities,
                        user: userData
                    });
                } catch (retryErr: any) {
                    // Retry also failed — return safe empty payload, NOT 401
                    return NextResponse.json({
                        accounts: [], positions: [], history: [],
                        warning: `Capital.com session could not be established: ${retryErr.message}`,
                        user: userData
                    }); // HTTP 200 — user IS authenticated, just Capital.com is down
                }
            }

            // Other Capital.com errors (not session-related)
            return NextResponse.json({
                accounts: [], positions: [], history: [],
                warning: `Capital.com error: ${msg}`,
                user: userData
            }); // HTTP 200 — user IS authenticated
        }

    } catch (error: any) {
        console.error('[Dashboard API] Fatal Error:', error);
        return NextResponse.json({
            message: 'Internal Server Error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
