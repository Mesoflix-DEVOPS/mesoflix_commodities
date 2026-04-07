import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { clearAuthCookies } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get('refresh_token')?.value;

        // Revoke token via stable SDK
        if (refreshToken) {
            await supabase
                .from('refresh_tokens')
                .update({ revoked: true })
                .eq('token_hash', refreshToken);
        }

        await clearAuthCookies();
        return NextResponse.json({ message: 'Logged out successfully' });

    } catch (error: any) {
        console.error('Logout Error:', error.message);
        return NextResponse.json({ message: 'Logout Failure' }, { status: 500 });
    }
}
