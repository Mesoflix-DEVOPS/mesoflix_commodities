import { NextRequest } from "next/server";
import { getValidSession } from "@/lib/capital-service";
import { verifyAccessToken } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    // 1. Authenticate user request
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
        return new Response('Unauthorized', { status: 401 });
    }

    const tokenPayload = await verifyAccessToken(accessToken);
    if (!tokenPayload) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userId = tokenPayload.userId;

    // 2. Setup SSE headers
    const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
    });

    // Get mode and epics from URL
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'demo';
    const isDemo = mode === 'demo';
    const epicsParam = searchParams.get('epics');
    const epics = epicsParam ? epicsParam.split(',') : ['IX.D.GOLD.IFM.IP', 'IX.D.WTI.IFM.IP', 'EU.D.EURUSD.CASH.IP', 'BT.D.BTCUSD.CASH.IP'];

    // 3. Obtain Capital.com session
    let session;
    try {
        session = await getValidSession(userId, isDemo);
    } catch (err: any) {
        console.error("[Stream API] Failed to get Valid Session:", err.message);
        const errorStream = new ReadableStream({
            start(controller) {
                const message = `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`;
                controller.enqueue(new TextEncoder().encode(message));
                controller.close();
            }
        });
        return new Response(errorStream, { headers });
    }

    // 4. Create an SSE stream
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: any) => {
                const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(new TextEncoder().encode(message));
            };

            // Connect to Capital.com WebSocket
            const wsUrl = isDemo ? 'wss://demo-api-capital.backend-capital.com/ws' : 'wss://api-capital.backend-capital.com/ws';

            let ws: any;

            try {
                // Dynamically import ws inside the stream start to avoid Edge runtime issues if this runs there
                const WebSocket = require('ws');
                ws = new WebSocket(wsUrl);

                ws.on('open', () => {
                    // Send ping/auth or subscribe messages immediately
                    console.log(`[Stream API] WebSocket Connected to ${wsUrl}`);

                    // The subscribe request for Ohlc/Quotes
                    ws.send(JSON.stringify({
                        destination: "OHLCMarketData.subscribe",
                        cst: session.cst,
                        securityToken: session.xSecurityToken,
                        payload: {
                            epics: epics,
                            resolution: "MINUTE_1"
                        }
                    }));
                });

                ws.on('message', (dataRaw: any) => {
                    try {
                        const data = JSON.parse(dataRaw.toString());
                        // Route Capital.com WebSocket responses to the client
                        sendEvent('market-data', data);
                    } catch (e) {
                        console.error("Error parsing WS message:", e);
                    }
                });

                ws.on('close', () => {
                    console.log("[Stream API] WebSocket Closed.");
                    sendEvent('system', { status: 'disconnected' });
                    controller.close();
                });

                ws.on('error', (err: any) => {
                    console.error("[Stream API] WebSocket Error:", err);
                    sendEvent('error', { message: 'WebSocket connection error' });
                    controller.close();
                });

                // Handle client disconnects to clean up Capital.com websocket
                req.signal.addEventListener('abort', () => {
                    console.log("[Stream API] Client disconnected from SSE.");
                    if (ws.readyState === 1 /* OPEN */) {
                        ws.close();
                    }
                    controller.close();
                });

            } catch (err: any) {
                console.error("[Stream API] Failed to establish WebSocket:", err);
                sendEvent('error', { message: "Internal stream creation error: " + err.message });
                controller.close();
            }
        },
    });

    return new Response(stream, { headers });
}
