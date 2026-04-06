import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function generateRecoveryCodes(count: number = 10): { raw: string, hash: string }[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const rawCode = crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const hash = crypto.createHash('sha256').update(rawCode).digest('hex');
        codes.push({ raw: rawCode, hash });
    }
    return codes;
}

function base32Decode(base32String: string): Buffer {
    let base32 = base32String.replace(/-/g, '').toUpperCase();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const array = [];

    for (let i = 0; i < base32.length; i++) {
        const index = alphabet.indexOf(base32[i]);
        if (index === -1) continue; 
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            array.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(array);
}

function getTOTPForTime(secret: string, timeSeconds: number): string {
    const key = base32Decode(secret);
    const timeBuffer = Buffer.alloc(8);
    let counter = Math.floor(timeSeconds / 30);
    for (let i = 7; i >= 0; i--) {
        timeBuffer[i] = counter & 255;
        counter >>>= 8;
    }
    const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    return (code % 1000000).toString().padStart(6, '0');
}

export async function POST(req: Request) {
    try {
        const { code } = await req.json();
        if (!code) return NextResponse.json({ error: 'MFA Code Required' }, { status: 400 });

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

        if (userError || !user || !user.two_factor_secret) {
            return NextResponse.json({ error: 'MFA Setup Not Initialized' }, { status: 400 });
        }

        // 2. Verify TOTP
        const cleanCode = code.replace(/\s/g, '');
        const currentTime = Math.floor(Date.now() / 1000);
        const validCodes = [
            getTOTPForTime(user.two_factor_secret, currentTime - 30),
            getTOTPForTime(user.two_factor_secret, currentTime),
            getTOTPForTime(user.two_factor_secret, currentTime + 30)
        ];

        if (!validCodes.includes(cleanCode)) {
            return NextResponse.json({ error: 'Invalid MFA Code' }, { status: 401 });
        }

        // 3. Enable MFA via stable SDK
        await supabase.from('users').update({ two_factor_enabled: true, updated_at: new Date() }).eq('id', userId);

        // 4. Recovery Codes Management
        const newCodes = generateRecoveryCodes(10);
        await supabase.from('recovery_codes').delete().eq('user_id', userId);
        
        const insertData = newCodes.map(c => ({
            user_id: userId,
            code_hash: c.hash,
            used: false
        }));

        await supabase.from('recovery_codes').insert(insertData);

        return NextResponse.json({
            success: true,
            recoveryCodes: newCodes.map(c => c.raw)
        });

    } catch (error: any) {
        console.error('2FA Verify Setup Error:', error.message);
        return NextResponse.json({ error: 'Security Bridge Offline' }, { status: 500 });
    }
}
