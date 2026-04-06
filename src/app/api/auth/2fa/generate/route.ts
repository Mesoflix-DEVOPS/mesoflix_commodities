import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userCookie = await verifyAccessToken(accessToken);
        if (!userCookie || !userCookie.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = userCookie.userId;

        // 1. Fetch User via stable SDK
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (user.two_factor_enabled) return NextResponse.json({ error: 'MFA Already Active' }, { status: 400 });

        // 2. Generate Secret via Base32 Math
        const buffer = crypto.randomBytes(20);
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        let bits = 0;
        let value = 0;

        for (let i = 0; i < buffer.length; i++) {
            value = (value << 8) | buffer[i];
            bits += 8;
            while (bits >= 5) {
                secret += alphabet[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }
        if (bits > 0) secret += alphabet[(value << (5 - bits)) & 31];

        const otpauthUrl = `otpauth://totp/Mesoflix%20Commodities:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Mesoflix%20Commodities&algorithm=SHA1&digits=6&period=30`;

        // 3. Save secret via stable SDK
        await supabase
            .from('users')
            .update({ two_factor_secret: secret, updated_at: new Date() })
            .eq('id', userId);

        return NextResponse.json({ secret, otpauthUrl });

    } catch (error: any) {
        console.error('2FA Generate Error:', error.message);
        return NextResponse.json({ error: 'Security Bridge Offline' }, { status: 500 });
    }
}
