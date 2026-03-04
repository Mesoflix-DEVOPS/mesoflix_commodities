import { db } from '@/lib/db';
import { users, notifications, platformTrades } from '@/lib/db/schema';
import { getValidSession } from '@/lib/capital-service';
import { placeOrder, closePosition } from '@/lib/capital';
import { verifyAccessToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = tokenPayload.userId;
        const body = await request.json();
        const {
            epic, direction, size,
            takeProfit, stopLoss, trailingStop,
            mode: requestMode = 'demo',
        } = body;

        if (!epic || !direction || !size) {
            return NextResponse.json({ error: 'Missing required fields: epic, direction, size' }, { status: 400 });
        }

        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const isDemo = requestMode === 'demo';

        const executeWithSession = async (forceRefresh = false) => {
            const session = await getValidSession(userId, isDemo, forceRefresh);
            console.log(`[Trade API] Executing order on account ${session.activeAccountId} via ${session.serverUrl}`);
            const accountIsDemo = session.accountIsDemo ?? false;
            return placeOrder(
                session.cst, session.xSecurityToken,
                epic, direction, parseFloat(size),
                accountIsDemo,
                {
                    takeProfit: takeProfit ? parseFloat(takeProfit) : null,
                    stopLoss: stopLoss ? parseFloat(stopLoss) : null,
                    trailingStop: Boolean(trailingStop),
                },
                session.serverUrl
            );
        };

        try {
            const result = await executeWithSession();

            // Push notification
            await db.insert(notifications).values({
                user_id: userId,
                title: 'Position Opened',
                message: `Successfully executed a ${direction} block on ${epic} for ${size} units.`,
                type: 'success'
            });

            if (result && result.dealReference) {
                try {
                    await db.insert(platformTrades).values({
                        user_id: userId,
                        deal_id: result.dealReference,
                        epic,
                        direction,
                        size: String(size),
                        mode: isDemo ? 'demo' : 'live'
                    });
                } catch (dbErr) {
                    console.error("Failed to insert locally into platformTrades:", dbErr);
                }
            }

            try {
                const { sql } = require('drizzle-orm');
                await db.delete(platformTrades).where(sql`created_at < NOW() - INTERVAL '1 day'`);
            } catch (e) {
                console.error("Cleanup failed", e);
            }

            return NextResponse.json({ success: true, ...result });
        } catch (err: any) {
            console.error('[Trade API] First attempt failed:', err.message);
            // Auto-retry with fresh session on auth errors
            if (err.message.includes('401') || err.message.toLowerCase().includes('session') || err.message.toLowerCase().includes('unauthorized')) {
                try {
                    const result = await executeWithSession(true);

                    await db.insert(notifications).values({
                        user_id: userId,
                        title: 'Position Opened',
                        message: `Successfully executed a ${direction} block on ${epic} for ${size} units (Auth Retry).`,
                        type: 'success'
                    });

                    return NextResponse.json({ success: true, ...result });
                } catch (retryErr: any) {
                    return NextResponse.json({ error: `Trade failed after retry: ${retryErr.message}` }, { status: 502 });
                }
            }
            return NextResponse.json({ error: err.message }, { status: 502 });
        }

    } catch (error: any) {
        console.error('[Trade API] Fatal error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { closedTrades } from '@/lib/db/schema';

export async function DELETE(request: Request) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = tokenPayload.userId;
        const { searchParams } = new URL(request.url);
        const dealId = searchParams.get('dealId');
        const mode = searchParams.get('mode') || 'demo';

        if (!dealId) {
            return NextResponse.json({ error: 'Missing dealId' }, { status: 400 });
        }

        const isDemo = mode === 'demo';

        // Try parsing body for trade details, if present (frontend should pass it)
        let requestBody: any = {};
        try {
            requestBody = await request.json();
        } catch (e) {
            // body is optional
        }

        const executeClose = async (forceRefresh = false) => {
            const session = await getValidSession(userId, isDemo, forceRefresh);
            console.log(`[Trade API] Closing deal ${dealId} on account ${session.activeAccountId} via ${session.serverUrl}`);
            const accountIsDemo = session.accountIsDemo ?? false;
            return closePosition(session.cst, session.xSecurityToken, dealId, accountIsDemo, session.serverUrl);
        };

        try {
            const result = await executeClose();

            await db.insert(notifications).values({
                user_id: userId,
                title: 'Position Closed',
                message: `Successfully closed deal ${dealId}.`,
                type: 'info'
            });

            // Store in our database for the Transactions table
            if (requestBody && requestBody.epic && requestBody.direction) {
                try {
                    await db.insert(closedTrades).values({
                        user_id: userId,
                        deal_id: dealId,
                        epic: requestBody.epic,
                        direction: requestBody.direction,
                        size: String(requestBody.size || 0),
                        open_price: String(requestBody.openPrice || 0),
                        close_price: String(result.level ?? 0),
                        pnl: String(requestBody.pnl || 0),
                        mode: isDemo ? 'demo' : 'live'
                    });
                } catch (dbErr) {
                    console.error("Failed to insert into closedTrades:", dbErr);
                }
            }

            try {
                // Cleanup platform trades older than 1 day
                const { sql } = require('drizzle-orm');
                await db.delete(platformTrades).where(sql`created_at < NOW() - INTERVAL '1 day'`);

                // Also cleanup closed_trades older than 1 day to ensure it respects the 24-hour retention requirement
                await db.delete(closedTrades).where(sql`created_at < NOW() - INTERVAL '1 day'`);
            } catch (e) {
                console.error("Cleanup failed", e);
            }

            return NextResponse.json({ success: true, ...result });
        } catch (err: any) {
            console.error('[Trade API] First close attempt failed:', err.message);
            if (err.message.includes('401') || err.message.toLowerCase().includes('session') || err.message.toLowerCase().includes('unauthorized')) {
                try {
                    const result = await executeClose(true);

                    await db.insert(notifications).values({
                        user_id: userId,
                        title: 'Position Closed',
                        message: `Successfully closed deal ${dealId} (Auth Retry).`,
                        type: 'info'
                    });

                    if (requestBody && requestBody.epic && requestBody.direction) {
                        try {
                            await db.insert(closedTrades).values({
                                user_id: userId,
                                deal_id: dealId,
                                epic: requestBody.epic,
                                direction: requestBody.direction,
                                size: String(requestBody.size || 0),
                                open_price: String(requestBody.openPrice || 0),
                                close_price: String(result.level ?? 0),
                                pnl: String(requestBody.pnl || 0),
                                mode: isDemo ? 'demo' : 'live'
                            });
                        } catch (dbErr) {
                            console.error("Failed to insert into closedTrades after retry:", dbErr);
                        }
                    }

                    return NextResponse.json({ success: true, ...result });
                } catch (retryErr: any) {
                    return NextResponse.json({ error: `Close failed after retry: ${retryErr.message}` }, { status: 502 });
                }
            }
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
    } catch (error: any) {
        console.error('[Trade API] Fatal close error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

