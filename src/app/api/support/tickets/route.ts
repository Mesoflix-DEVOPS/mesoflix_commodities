import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth';

import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const getUserIdFromSession = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    return payload ? (payload.userId as string) : null;
};

export async function POST(req: Request) {
    try {
        const { category, subject, description, email } = await req.json();
        if (!category || !subject || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let userId = await getUserIdFromSession();
        if (!userId && category === 'ONBOARDING') {
            userId = email || 'GUEST_ONBOARDING';
        }

        if (!userId) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

        // Institutional Bridge: Create Ticket via stable SDK
        const { data: newTicket, error: ticketError } = await supabase
            .from('tickets')
            .insert({
                user_id: userId,
                category,
                subject,
                description,
                status: "OPEN",
                priority: "NORMAL",
                onboarding_status: category === 'ONBOARDING' ? 'REQUESTED' : null
            })
            .select('id')
            .single();

        if (ticketError || !newTicket) throw ticketError;

        // Auto-message insertion via stable SDK
        await supabase.from('ticket_messages').insert({
            ticket_id: newTicket.id,
            sender_id: userId,
            sender_type: "user",
            message: description,
            read_status: false,
        });

        return NextResponse.json({ success: true, ticketId: newTicket.id });

    } catch (error: any) {
        console.error("Concierge Bridge Failure:", error.message);
        return NextResponse.json({ error: "Support Bridge Offline" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const userId = await getUserIdFromSession();
        if (!userId) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

        const { data: userTickets, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, tickets: userTickets || [] });

    } catch (error: any) {
        console.error("Support Fetch Failure:", error.message);
        return NextResponse.json({ error: "Support Database Error" }, { status: 500 });
    }
}
