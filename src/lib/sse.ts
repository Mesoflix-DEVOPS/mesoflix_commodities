import { NextRequest } from 'next/server';

type ClientParams = {
    userId?: string;
    agentId?: string;
    ticketId?: string; // Optional: To subscribe specifically to one ticket
};

export type SSEClient = {
    id: string;
    controller: ReadableStreamDefaultController;
    params: ClientParams;
};

// Global store for SSE clients across API routes in dev/prod
declare global {
    var _sseClients: SSEClient[] | undefined;
}

const getClients = () => {
    if (!global._sseClients) {
        global._sseClients = [];
    }
    return global._sseClients;
};

export const addClient = (client: SSEClient) => {
    const clients = getClients();
    clients.push(client);
    console.log(`[SSE] Client connected. Total: ${clients.length}`);
};

export const removeClient = (id: string) => {
    const clients = getClients();
    global._sseClients = clients.filter((c) => c.id !== id);
    console.log(`[SSE] Client disconnected. Total: ${global._sseClients.length}`);
};

/**
 * Broadcast an event to clients matching a specific condition.
 * Usage: broadcastSSE('new_message', { text: 'Hello' }, (client) => client.params.ticketId === '123')
 */
export const broadcastSSE = (
    event: string,
    data: any,
    targetPredicate?: (client: SSEClient) => boolean
) => {
    const clients = getClients();
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    let count = 0;
    clients.forEach((client) => {
        if (!targetPredicate || targetPredicate(client)) {
            try {
                client.controller.enqueue(new TextEncoder().encode(payload));
                count++;
            } catch (err) {
                // If stream is closed or broken, we will clean it up later if needed,
                // but usually the readable stream cancel event handles cleanup.
            }
        }
    });
    console.log(`[SSE] Broadcasted '${event}' to ${count} clients.`);
};
