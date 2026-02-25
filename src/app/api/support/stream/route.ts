import { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { addClient, removeClient, SSEClient } from '@/lib/sse';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const adminToken = searchParams.get('token'); // Used for agents
    const ticketId = searchParams.get('ticketId') || undefined;

    let userId: string | undefined;
    let agentId: string | undefined;

    // Check agent token first
    if (adminToken) {
        const payload = await verifyAccessToken(adminToken);
        if (payload?.role === 'agent' || payload?.role === 'supervisor') {
            agentId = payload.userId;
        } else {
            return new Response('Unauthorized agent', { status: 401 });
        }
    } else {
        // Check session cookies
        const cookieStore = require('next/headers').cookies;
        const cookies = await cookieStore();
        const userToken = cookies.get('access_token')?.value;
        const agentToken = cookies.get('agent_session')?.value;

        if (agentToken) {
            try {
                const jose = require('jose');
                const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_must_change_in_prod');
                const result = await jose.jwtVerify(agentToken, JWT_SECRET);
                if (result.payload?.sub) {
                    agentId = result.payload.sub as string;
                }
            } catch (e) {
                // ignore
            }
        } else if (userToken) {
            const payload = await verifyAccessToken(userToken);
            if (payload) {
                userId = payload.userId;
            }
        }
    }

    if (!userId && !agentId) {
        return new Response('Unauthorized', { status: 401 });
    }

    const clientId = randomUUID();

    const stream = new ReadableStream({
        start(controller) {
            const client: SSEClient = {
                id: clientId,
                controller,
                params: {
                    userId,
                    agentId,
                    ticketId,
                },
            };
            addClient(client);

            // Send initial ping to confirm connection
            const payload = `event: connected\ndata: {"status": "ok"}\n\n`;
            controller.enqueue(new TextEncoder().encode(payload));

            // Keep connection alive
            const timer = setInterval(() => {
                try {
                    controller.enqueue(new TextEncoder().encode(`:keepalive\n\n`));
                } catch {
                    clearInterval(timer);
                }
            }, 10000); // 10s keepalive

            // Cleanup when stream is canceled by the framework (e.g., client disconnects)
            request.signal.addEventListener('abort', () => {
                clearInterval(timer);
                removeClient(clientId);
            });
        },
        cancel() {
            removeClient(clientId);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // For NGINX proxies
        },
    });
}
