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
        let userId: string | null = null;
        let userRole: string | null = null;

        // Try standard auth first
        const { auth } = await import('@/lib/auth');
        const session = await auth();
        
        if (session) {
            userId = session.user.id;
            userRole = session.user.role;
        } else {
            // Fallback to agent_session
            const token = cookieStore.get('agent_session')?.value;
            if (token) {
                try {
                    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
                    userId = payload.sub as string;
                    userRole = payload.role as string;
                } catch (e) {
                    return NextResponse.json({ error: "Invalid agent session" }, { status: 401 });
                }
            }
        }

        if (!userId || !['admin', 'staff', 'agent'].includes(userRole || '')) {
            return NextResponse.json({ error: "Access Denied: Specialized Access Required" }, { status: 403 });
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
