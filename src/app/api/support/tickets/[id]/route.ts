import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: any }) {
    try {
        const { id } = await params;

        // Fetch ticket via stable SDK
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        // Fetch messages via stable SDK
        const { data: messages, error: messagesError } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', id)
            .order('created_at', { ascending: true });

        return NextResponse.json({
            ticket,
            messages: messages || [],
        });

    } catch (error: any) {
        console.error("Support Bridge Error:", error.message);
        return NextResponse.json({ error: "Support Detail Offline" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: any }) {
    try {
        const { id } = await params;
        const { status } = await req.json();

        if (status === "CLOSED") {
            await supabase
                .from('tickets')
                .update({ status: "CLOSED" })
                .eq('id', id);

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    } catch (error: any) {
        console.error("Failed to close ticket:", error.message);
        return NextResponse.json({ error: "Support Patch Offline" }, { status: 500 });
    }
}
