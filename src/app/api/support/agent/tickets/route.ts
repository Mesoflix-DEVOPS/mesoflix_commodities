import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import * as jose from 'jose';

import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const JWT_SECRET_STRING = process.env.JWT_SECRET;
if (!JWT_SECRET_STRING && process.env.NODE_ENV === 'production') {
    throw new Error("FATAL: JWT_SECRET environment variable is required for support backend in production.");
}

const JWT_SECRET = new TextEncoder().encode(
    JWT_SECRET_STRING || 'mesoflix-commodity-terminal-internal-fallback-v1'
);

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('agent_session')?.value;

        if (!token) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

        try {
            const { payload } = await jose.jwtVerify(token, JWT_SECRET);
            // Verify payload has required fields
            if (!payload.sub || (payload.role !== 'admin' && payload.role !== 'staff' && payload.role !== 'agent')) {
                 return NextResponse.json({ error: "Access Denied: Insufficient Role" }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: "Invalid or expired agent session" }, { status: 401 });
        }

        // Institutional Bridge: Fetch all tickets via stable SDK
        const { data: allTickets, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (ticketError) throw ticketError;

        // Fetch latest message for snippets via stable SDK
        const resolvedTickets = await Promise.all((allTickets || []).map(async (t) => {
            const { data: latestMsgs } = await supabase
                .from('ticket_messages')
                .select('*')
                .eq('ticket_id', t.id)
                .order('created_at', { ascending: false })
                .limit(1);

            const latestMsg = latestMsgs?.[0];

            return {
                ...t,
                last_message: latestMsg?.message || "No messages.",
                unread: latestMsg?.sender_type === "user" && !latestMsg?.read_status
            }
        }));

        return NextResponse.json({ tickets: resolvedTickets });

    } catch (error: any) {
        console.error("Agent tickets fetch error:", error.message);
        return NextResponse.json({ error: "Support Database Error" }, { status: 500 });
    }
}
