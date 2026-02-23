import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';

export const dynamic = 'force-dynamic';

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';
const DEMO_API = 'https://demo-api-capital.backend-capital.com/api/v1';

// Price fetch — single lightweight call to /markets
async function fetchTick(epic: string, cst: string, xst: string, isDemo: boolean) {
    const base = isDemo ? DEMO_API : LIVE_API;
    const res = await fetch(`${base}/markets?epics=${epic}`, {
        headers: { CST: cst, 'X-SECURITY-TOKEN': xst },
        signal: AbortSignal.timeout(4000),
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const detail = data?.marketDetails?.[0];
    if (!detail) throw new Error('no data');
    const snap = detail.snapshot;
    return {
        ts: Date.now(),
        bid: snap?.bid ?? 0,
        ask: snap?.offer ?? 0,
        high: snap?.high ?? 0,
        low: snap?.low ?? 0,
        net: snap?.netChange ?? 0,
        pct: snap?.percentageChange ?? 0,
        status: snap?.marketStatus ?? 'TRADEABLE',
    };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ epic: string }> }) {
    const { epic } = await params;

    // Auth
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) return new Response('Unauthorized', { status: 401 });
    const payload = await verifyAccessToken(token);
    if (!payload) return new Response('Unauthorized', { status: 401 });

    const mode = req.nextUrl.searchParams.get('mode') || 'demo';
    const isDemo = mode === 'demo';

    // Set up the SSE stream
    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
        async start(controller) {
            const send = (obj: object) => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
                } catch { closed = true; }
            };

            // Send heartbeat immediately so client knows connection is alive
            send({ type: 'connected', epic });

            let cst = '';
            let xst = '';
            let accountIsDemo = false;

            const refreshSession = async (force = false) => {
                const session = await getValidSession(payload.userId, isDemo, force);
                cst = session.cst;
                xst = session.xSecurityToken;
                accountIsDemo = session.accountIsDemo ?? isDemo;
            };

            try {
                await refreshSession();
            } catch (e: any) {
                send({ type: 'error', message: e.message });
                controller.close();
                return;
            }

            // Poll Capital.com every 800ms and stream each tick
            while (!closed) {
                try {
                    const tick = await fetchTick(epic, cst, xst, accountIsDemo);
                    send({ type: 'tick', ...tick });
                } catch (e: any) {
                    const msg = String(e.message);
                    if (msg === '401') {
                        // Session expired — refresh once
                        try { await refreshSession(true); } catch { closed = true; break; }
                    } else if (msg.includes('AbortError') || msg.includes('timeout')) {
                        // skip this tick — Capital.com slow
                    } else {
                        send({ type: 'warn', message: msg });
                    }
                }

                // Wait 800ms between ticks
                await new Promise(r => setTimeout(r, 800));
            }

            try { controller.close(); } catch { }
        },
        cancel() { closed = true; },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',     // tells Netlify/nginx not to buffer
        },
    });
}
