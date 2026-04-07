import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Institutional Bridge: Fetch all users via stable SDK
        const { data: allUsers, error } = await supabase
            .from('users')
            .select('id, email, full_name, role, created_at, last_login_at, email_verified, two_factor_enabled')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, users: allUsers || [] });
    } catch (error: any) {
        console.error("Failed to fetch users for agent dashboard:", error.message);
        return NextResponse.json({ error: "Support User Sync Failure" }, { status: 500 });
    }
}
