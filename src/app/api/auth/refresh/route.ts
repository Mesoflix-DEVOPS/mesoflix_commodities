import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const incomingRefreshToken = cookieStore.get('refresh_token')?.value;

        if (!incomingRefreshToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // 1. Find Refresh Token in DB via stable SDK
        const { data: storedToken, error: tokenError } = await supabase
            .from('refresh_tokens')
            .select('*')
            .eq('token_hash', incomingRefreshToken)
            .eq('revoked', false)
            .single();

        if (tokenError || !storedToken) {
            return NextResponse.json({ message: 'Invalid Refresh Token' }, { status: 403 });
        }

        // 2. Check Expiry
        if (new Date() > new Date(storedToken.expires_at)) {
            return NextResponse.json({ message: 'Refresh Token Expired' }, { status: 403 });
        }

        // 3. Get User via stable SDK
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', storedToken.user_id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ message: 'Identity Sync Failure' }, { status: 404 });
        }

        // 4. Rotation: Revoke old token, Issue new via stable SDK
        await supabase.from('refresh_tokens').update({ revoked: true }).eq('id', storedToken.id);

        const newAccessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
            tokenVersion: user.token_version || 0,
        });

        const newRefreshToken = generateRefreshToken();

        await supabase.from('refresh_tokens').insert({
            user_id: user.id,
            token_hash: newRefreshToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        // 5. Set Cookies
        await setAuthCookies(newAccessToken, newRefreshToken);

        return NextResponse.json({ message: 'Token refreshed' });

    } catch (error: any) {
        console.error('Refresh Error:', error.message);
        return NextResponse.json({ message: 'Security Bridge Offline' }, { status: 500 });
    }
}
