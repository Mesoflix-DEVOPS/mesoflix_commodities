import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { fullName, email, password } = await req.json();

        if (!fullName || !email || !password) {
            return NextResponse.json({ error: "All corporate credentials required" }, { status: 400 });
        }

        if (password.length < 8) return NextResponse.json({ error: "Security Policy: Min 8 chars" }, { status: 400 });

        // Institutional Bridge: Check existing agent via stable SDK
        const { data: existing } = await supabase
            .from('support_agents')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) return NextResponse.json({ error: "Agent Identity Collision" }, { status: 409 });

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Persistent Registry via stable SDK
        await supabase
            .from('support_agents')
            .insert({
                email,
                password_hash,
                full_name: fullName,
                role: 'agent',
                is_active: true
            });

        return NextResponse.json({ success: true }, { status: 201 });

    } catch (error: any) {
        console.error("Agent registration error:", error.message);
        return NextResponse.json({ error: "Security Bridge Offline" }, { status: 500 });
    }
}
