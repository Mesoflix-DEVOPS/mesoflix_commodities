import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import * as jose from 'jose';

export const dynamic = 'force-dynamic';

const JWT_SECRET_STRING = process.env.JWT_SECRET;
if (!JWT_SECRET_STRING && process.env.NODE_ENV === 'production') {
    throw new Error("FATAL: JWT_SECRET environment variable is required for support users backend in production.");
}

const JWT_SECRET = new TextEncoder().encode(
    JWT_SECRET_STRING || 'mesoflix-commodity-terminal-internal-fallback-v1'
);

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('agent_session')?.value;

        if (!token) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

        try {
            const { payload } = await jose.jwtVerify(token, JWT_SECRET);
            if (!payload.sub || (payload.role !== 'admin' && payload.role !== 'staff' && payload.role !== 'agent')) {
                 return NextResponse.json({ error: "Access Denied: Insufficient Role" }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: "Invalid or expired agent session" }, { status: 401 });
        }
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
