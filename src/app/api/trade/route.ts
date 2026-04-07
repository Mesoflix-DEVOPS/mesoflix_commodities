import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getValidSession } from '@/lib/capital-service';
import { placeOrder, closePosition, getConfirm } from '@/lib/capital';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Helper: Trigger Instant Sync on Render Bridge (Item 11 Hot-Link)
const triggerSync = (userId: string) => {
    const bridgeUrl = process.env.RENDER_URL || 'https://mesoflix-commodities.onrender.com';
    const secret = process.env.BRIDGE_SECRET || 'mesoflix-bridge-internal-2024';
    
    fetch(`${bridgeUrl}/api/bridge/sync-trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, secret })
    }).catch(e => console.warn(`[Sync Signal] Deferred: ${e.message}`));
};

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

        const isDemo = requestMode === 'demo';

        const executeWithSession = async (forceRefresh = false) => {
            const session = await getValidSession(userId, isDemo, forceRefresh);
            const accountIsDemo = session.accountIsDemo ?? false;

            // STRICT ACCOUNT MODE GUARD: Prevent cross-account execution
            if (accountIsDemo !== isDemo) {
                 throw new Error(`Account Mode Mismatch: Requested ${isDemo ? 'Demo' : 'Real'} but retrieved ${accountIsDemo ? 'Demo' : 'Real'}. Please refresh.`);
            }

            const result = await placeOrder(
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

            let dealId = result.dealReference;
            // Background check for final Deal ID without blocking excessively
            if (result && result.dealReference) {
                try {
                    // Shorter delay + timeout protection
                    await new Promise(res => setTimeout(res, 200));
                    const confirmRes = await getConfirm(session.cst, session.xSecurityToken, result.dealReference, accountIsDemo, session.serverUrl);
                    if (confirmRes && confirmRes.dealId) dealId = confirmRes.dealId;
                } catch (e) {
                    console.warn('[Trade API] Optional confirmation failed, using reference ID');
                }
            }

            return { result, dealId };
        };

        try {
            const { result, dealId } = await (async () => {
                try {
                    return await executeWithSession();
                } catch (err: any) {
                    const msg = err.message || '';
                    if (msg.includes('401') || msg.toLowerCase().includes('session')) {
                        return await executeWithSession(true);
                    }
                    throw err;
                }
            })();

            // Record Trade & Notification via stable SDK
            await supabase.from('notifications').insert({
                user_id: userId,
                title: 'Position Opened',
                message: `Successfully executed a ${direction} block on ${epic}.`,
                type: 'success'
            });

            if (dealId) {
                await supabase.from('platform_trades').insert({
                    user_id: userId,
                    deal_id: dealId,
                    epic,
                    direction,
                    size: String(size),
                    mode: isDemo ? 'demo' : 'live',
                    created_at: new Date()
                });
            }

            // 🏁 INSTANT SYNC TRIGGER: Pulse the dashboard (Item 11 Fix)
            triggerSync(userId);

            return NextResponse.json({ success: true, ...result });

        } catch (err: any) {
            console.error('[Trade API] Execution Fatal:', err.message);
            return NextResponse.json({ error: err.message }, { status: 502 });
        }

    } catch (error: any) {
        console.error('[Trade API] Request Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}

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

        if (!dealId) return NextResponse.json({ error: 'Missing dealId' }, { status: 400 });

        const isDemo = mode === 'demo';
        let requestBody: any = {};
        try { requestBody = await request.json(); } catch { }

        const executeClose = async (forceRefresh = false) => {
            const session = await getValidSession(userId, isDemo, forceRefresh);
            const accountIsDemo = session.accountIsDemo ?? false;
            return closePosition(session.cst, session.xSecurityToken, dealId, accountIsDemo, session.serverUrl);
        };

        try {
            // Immediate attempt
            const result = await (async () => {
                try {
                    return await executeClose();
                } catch (err: any) {
                    if (err.message.includes('401') || err.message.toLowerCase().includes('session')) {
                        return await executeClose(true);
                    }
                    throw err;
                }
            })();

            await supabase.from('notifications').insert({
                user_id: userId,
                title: 'Position Closed',
                message: `Successfully closed deal ${dealId}.`,
                type: 'info'
            });

            if (requestBody?.epic) {
                await supabase.from('closed_trades').insert({
                    user_id: userId,
                    deal_id: dealId,
                    epic: requestBody.epic,
                    direction: requestBody.direction || 'BUY',
                    size: String(requestBody.size || 0),
                    open_price: String(requestBody.openPrice || 0),
                    close_price: String(result.level ?? 0),
                    pnl: String(requestBody.pnl || 0),
                    mode: isDemo ? 'demo' : 'live',
                    created_at: new Date()
                });
            }

            // 🏁 INSTANT SYNC TRIGGER: Pulse the dashboard (Item 11 Fix)
            triggerSync(userId);

            return NextResponse.json({ success: true, ...result });

        } catch (err: any) {
            console.error('[Close API] Execution Failure:', err.message);
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
    } catch (error: any) {
        console.error('[Close API] Fatal Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}

