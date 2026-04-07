import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth';

import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: any }) {
    try {
        const { id } = await params;
        const { message, attachmentUrl } = await req.json();

        if (!message && !attachmentUrl) {
            return NextResponse.json({ error: "Message content or attachment required" }, { status: 400 });
        }

        // Authenticate User
        const cookieStore = await cookies();
        const token = cookieStore.get('access_token')?.value;

        if (!token) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        if (!payload || !payload.userId) return NextResponse.json({ error: "Invalid user session" }, { status: 401 });

        // Institutional Bridge: Validate ticket via stable SDK
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select('user_id')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        if (ticket.user_id !== payload.userId) return NextResponse.json({ error: "Forbidden: Ownership mismatch" }, { status: 403 });

        // Insert message via stable SDK
        const { data: newMessage, error: msgError } = await supabase
            .from('ticket_messages')
            .insert({
                ticket_id: id,
                sender_id: payload.userId,
                sender_type: "user",
                message: message || '',
                attachment_url: attachmentUrl,
                read_status: false,
            })
            .select('*')
            .single();

        if (msgError || !newMessage) throw msgError;

        // Broadcast via bridge
        import('@/lib/sse').then(({ broadcastSSE }) => {
            broadcastSSE('new_message', { ticketId: id, message: newMessage }, (client) => {
                return client.params.ticketId === id || !!client.params.agentId;
            });
        });

        return NextResponse.json({ success: true, messageId: newMessage.id });

    } catch (error: any) {
        console.error("User message POST error:", error.message);
        return NextResponse.json({ error: "Support Bridge Offline" }, { status: 500 });
    }
}
