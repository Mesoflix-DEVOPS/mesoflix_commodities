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
    const epics = epicsParam ? epicsParam.split(',') : ['GOLD', 'OIL_CRUDE', 'BTCUSD'];

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

            const cleanup = () => {
                isClosed = true;
                if (pollingTimer) clearInterval(pollingTimer);
                try { controller.close(); } catch { }
            };

            // Send initial ping to confirm connection
            sendEvent('connected', { status: 'ok' });

            const pollData = async () => {
                if (isClosed) return;
                try {
                    const { getAccounts, getPositions, getMarketTickers } = await import('@/lib/capital');

                    // Every poll, we ensure the session is still aligned with the requested mode.
                    // getValidSession will handle account switching if necessary.
                    const currentSession = await getValidSession(userId, isDemo);

                    const [accountsData, positionsData, marketData] = await Promise.all([
                        getAccounts(currentSession.cst, currentSession.xSecurityToken, isDemo, currentSession.serverUrl),
                        getPositions(currentSession.cst, currentSession.xSecurityToken, isDemo, currentSession.serverUrl),
                        getMarketTickers(currentSession.cst, currentSession.xSecurityToken, epics, isDemo, currentSession.serverUrl)
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

                    // Send balances
                    if (accountsData?.accounts) {
                        const activeAccountDetails = accountsData.accounts.find((a: any) => a.accountId === currentSession.activeAccountId);
                        if (activeAccountDetails) {
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
                    console.error("[Stream API] Polling loop error details:", err.message || err);
                    if (err.message?.includes('401') || err.message?.toLowerCase().includes('session')) {
                        console.error("[Stream API] Session expired or unauthorized, closing stream");
                        sendEvent('error', { message: 'Session expired during polling' });
                        cleanup();
                    }
                }
            };

            // 🏁 INSTITUTIONAL POLL RELAXATION (Item 13)
            // Initial burst, then 7.5s interval to prevent API amplification
            await pollData();
            if (!isClosed) {
                pollingTimer = setInterval(pollData, 7500);
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
