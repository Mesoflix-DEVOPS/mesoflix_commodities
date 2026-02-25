import { NextRequest } from "next/server";
import { getValidSession, getApiUrl } from "@/lib/capital-service";
import { verifyAccessToken } from "@/lib/auth";
import { cookies } from "next/headers";
import WebSocket from "ws";

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
            let ws: WebSocket | null = null;
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

            const wsUrl = getApiUrl(isDemo).replace('https://', 'wss://').replace('/api/v1', '/ws');

            try {
                ws = new WebSocket(wsUrl);

                ws.on('open', () => {
                    console.log(`[Stream API] WebSocket Connected to ${wsUrl}`);
                    ws?.send(JSON.stringify({
                        destination: "marketData.subscribe",
                        correlationId: "1",
                        cst: session.cst,
                        securityToken: session.xSecurityToken,
                        payload: { epics }
                    }));

                    // Aggressive pings every 30 seconds to keep connection alive indefinitely
                    const pingInterval = setInterval(() => {
                        if (ws?.readyState === 1) {
                            ws.send(JSON.stringify({
                                destination: "ping",
                                correlationId: "ping",
                                cst: session.cst,
                                securityToken: session.xSecurityToken
                            }));
                        } else {
                            clearInterval(pingInterval);
                        }
                    }, 30 * 1000);

                    ws?.on('close', () => clearInterval(pingInterval));
                    ws?.on('error', () => clearInterval(pingInterval));
                });

                ws.on('message', (dataRaw: any) => {
                    try {
                        const data = JSON.parse(dataRaw.toString());
                        sendEvent('market-data', data);
                    } catch (e) { }
                });

                ws.on('close', () => {
                    console.log("[Stream API] WebSocket Closed.");
                    sendEvent('system', { status: 'disconnected' });
                    isClosed = true;
                    cleanup();
                });

                ws.on('error', (err: any) => {
                    console.error("[Stream API] WebSocket Error:", err);
                    sendEvent('error', { message: 'WebSocket connection error' });
                    isClosed = true;
                    cleanup();
                });

                // Set up polling for balance and positions
                const pollData = async () => {
                    if (isClosed) return;
                    try {
                        const { getAccounts, getPositions } = await import('@/lib/capital');

                        const [accountsData, positionsData] = await Promise.all([
                            getAccounts(session.cst, session.xSecurityToken, false),
                            getPositions(session.cst, session.xSecurityToken, false)
                        ]);

                        // Send balances separated by mode depending on current session
                        if (accountsData?.accounts) {
                            const activeAccountDetails = accountsData.accounts.find((a: any) => a.accountId === session.accountId);
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

                    } catch (err: any) {
                        // Silent fail on minor polling errors to not aggressively kill stream
                        if (err.message?.includes('401') || err.message?.includes('session')) {
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

            } catch (err: any) {
                console.error("[Stream API] Failed to establish WebSocket:", err);
                sendEvent('error', { message: "Internal stream creation error: " + err.message });
                isClosed = true;
                cleanup();
            }

            function cleanup() {
                isClosed = true;
                if (pollingTimer) clearInterval(pollingTimer);
                if (ws?.readyState === 1) ws.close();
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
