import { NextRequest } from "next/server";
import { getValidSession } from "@/lib/capital-service";
import { verifyAccessToken } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) return new Response('Unauthorized', { status: 401 });

    const tokenPayload = await verifyAccessToken(accessToken);
    if (!tokenPayload) return new Response('Unauthorized', { status: 401 });

    const userId = tokenPayload.userId;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'demo';
    const isDemo = mode === 'demo';
    const epicsParam = searchParams.get('epics');
    const epics = epicsParam ? epicsParam.split(',') : ['GOLD', 'OIL_CRUDE', 'EURUSD', 'BTCUSD'];

    let session: any;
    try {
        session = await getValidSession(userId, isDemo);
    } catch (err: any) {
        return new Response(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`, {
            headers: { 'Content-Type': 'text/event-stream' }
        });
    }

    const stream = new ReadableStream({
        async start(controller) {
            let isClosed = false;
            let pollingTimer: NodeJS.Timeout | null = null;

            const sendEvent = (event: string, data: any) => {
                if (isClosed) return;
                try {
                    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(message));
                } catch {
                    isClosed = true;
                }
            };

            // Send initial ping to confirm connection
            sendEvent('connected', { status: 'ok' });

            const pollData = async () => {
                if (isClosed) return;
                try {
                    const { getAccounts, getPositions, getMarketTickers } = await import('@/lib/capital');

                    const [accountsData, positionsData, marketData] = await Promise.all([
                        getAccounts(session.cst, session.xSecurityToken, false),
                        getPositions(session.cst, session.xSecurityToken, false),
                        getMarketTickers(session.cst, session.xSecurityToken, epics, isDemo)
                    ]);

                    // Send market data
                    if (marketData && marketData.marketDetails) {
                        for (const detail of marketData.marketDetails) {
                            if (detail.instrument?.epic && detail.snapshot) {
                                sendEvent('market-data', {
                                    destination: 'quote',
                                    payload: {
                                        epic: detail.instrument.epic,
                                        bid: detail.snapshot.bid,
                                        offer: detail.snapshot.offer,
                                        netChange: detail.snapshot.netChange,
                                        percentageChange: detail.snapshot.percentageChange
                                    }
                                });
                            }
                        }
                    }

                    // Send balances separated by mode depending on current session
                    if (accountsData?.accounts) {
                        const activeAccountDetails = accountsData.accounts.find((a: any) => a.accountId === session.activeAccountId);
                        if (activeAccountDetails) {
                            // Provide simple structure mimicking /api/balance route
                            const balPayload = isDemo
                                ? { hasDemo: true, hasLive: true, demoBalance: activeAccountDetails.balance, realBalance: null }
                                : { hasDemo: true, hasLive: true, realBalance: activeAccountDetails.balance, demoBalance: null };
                            sendEvent('balance', balPayload);
                        }
                    }

                    if (positionsData?.positions) {
                        sendEvent('positions', positionsData.positions);
                    }

                } catch (error) {
                    const err = error as any;
                    console.error("[Stream API] Polling loop error details:", err.message);
                    // Silent fail on minor polling errors to not aggressively kill stream
                    if (err.message?.includes('401') || err.message?.includes('session')) {
                        console.error("[Stream API] Session expired, closing stream");
                        // Token expiration, force close to trigger auto-reconnect from client side
                        sendEvent('error', { message: 'Session expired during polling' });
                        isClosed = true;
                        cleanup();
                    }
                }
            };

            // Poll immediately, then every 3 seconds
            pollData();
            pollingTimer = setInterval(pollData, 3000);

            function cleanup() {
                isClosed = true;
                if (pollingTimer) clearInterval(pollingTimer);
                try { controller.close(); } catch { }
            }

            req.signal.addEventListener('abort', cleanup);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        }
    });
}
