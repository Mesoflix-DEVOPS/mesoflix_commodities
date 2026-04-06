import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import * as jose from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_must_change_in_prod'
);

export async function POST(req: Request, { params }: { params: any }) {
    try {
        const { id } = await params;
        const { message, attachmentUrl } = await req.json();

        if (!message && !attachmentUrl) {
            return NextResponse.json({ error: "Message content or attachment required" }, { status: 400 });
        }

        // Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('agent_session')?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

        let payload;
        try {
            const result = await jose.jwtVerify(token, JWT_SECRET);
            payload = result.payload;
        } catch (e) {
            return NextResponse.json({ error: "Invalid or expired agent session" }, { status: 401 });
        }

        // Institutional Bridge: Validate ticket via stable SDK
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

        // Insert message via stable SDK
        const { data: newMessage, error: msgError } = await supabase
            .from('ticket_messages')
            .insert({
                ticket_id: id,
                sender_id: payload.sub as string,
                sender_type: "agent",
                message: message || '',
                attachment_url: attachmentUrl,
                read_status: false,
            })
            .select('*')
            .single();

        if (msgError || !newMessage) throw msgError;

        // Auto-update ticket status via stable SDK
        if (ticket.status === "OPEN") {
            await supabase
                .from('tickets')
                .update({ status: "PENDING", assigned_agent_id: payload.sub as string })
                .eq('id', id);
        }

        // Broadcast via bridge
        import('@/lib/sse').then(({ broadcastSSE }) => {
            broadcastSSE('new_message', { ticketId: id, message: newMessage }, (client) => {
                return client.params.ticketId === id || !!client.params.agentId;
            });
        });

        return NextResponse.json({ success: true, messageId: newMessage.id });

    } catch (error: any) {
        console.error("Agent message POST error:", error.message);
        return NextResponse.json({ error: "Support Bridge Offline" }, { status: 500 });
    }
}
