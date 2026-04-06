import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = await verifyAccessToken(accessToken);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Institutional Bridge: Fetch profile via stable SDK
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, full_name, role, two_factor_enabled')
            .eq('id', payload.userId)
            .single();

        if (error || !user) {
            console.warn(`[User API] Lookup failed for ${payload.userId}`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                two_factor_enabled: user.two_factor_enabled,
            }
        });
    } catch (err: any) {
        console.error('[User API] Fatal Error:', err.message);
        return NextResponse.json({ error: 'Identity Bridge Offline' }, { status: 500 });
    }
}
