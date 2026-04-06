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

export async function PATCH(
    req: Request,
    { params }: { params: any }
) {
    try {
        const { id } = await params;
        const { meet_link, onboarding_status, status } = await req.json();

        // Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('agent_session')?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        try {
            await jose.jwtVerify(token, JWT_SECRET);
        } catch (e) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        const updateData: any = {};
        if (meet_link !== undefined) updateData.meet_link = meet_link;
        if (onboarding_status !== undefined) updateData.onboarding_status = onboarding_status;
        if (status !== undefined) updateData.status = status;

        // Institutional Bridge: Update Ticket via stable SDK
        await supabase
            .from('tickets')
            .update(updateData)
            .eq('id', id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Ticket update error:", error.message);
        return NextResponse.json({ error: "Support Bridge Offline" }, { status: 500 });
    }
}

export async function GET(
    req: Request,
    { params }: { params: any }
) {
    try {
        const { id } = await params;
        // Institutional Bridge: Fetch Ticket via stable SDK
        const { data: ticket, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !ticket) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        return NextResponse.json({ ticket });
    } catch (error: any) {
        return NextResponse.json({ error: "Support Database Error" }, { status: 500 });
    }
}
