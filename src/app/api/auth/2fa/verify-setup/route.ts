import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, recoveryCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Helper to generate secure random 10-character recovery codes
function generateRecoveryCodes(count: number = 10): { raw: string, hash: string }[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const rawCode = crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2-C3D4"
        const hash = crypto.createHash('sha256').update(rawCode).digest('hex');
        codes.push({ raw: rawCode, hash });
    }
    return codes;
}

// Helper to Base32 decode a TOTP secret natively without libraries
function base32Decode(base32String: string): Buffer {
    let base32 = base32String.replace(/-/g, '').toUpperCase();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const array = [];

    for (let i = 0; i < base32.length; i++) {
        const index = alphabet.indexOf(base32[i]);
        if (index === -1) continue; // Skip padding or invalid chars
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            array.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(array);
}

// Compute an exact TOTP code for a secret and a time window
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

        if (!code) {
            return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
        }

        // 1. Verify Authentication
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userCookie = await verifyAccessToken(accessToken);
        if (!userCookie || !userCookie.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch User & Secret
        const [user] = await db.select().from(users).where(eq(users.id, userCookie.userId)).limit(1);

        if (!user || (!user.two_factor_secret && !user.two_factor_enabled)) {
            return NextResponse.json({ error: '2FA setup not initialized' }, { status: 400 });
        }

        if (user.two_factor_enabled) {
            return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
        }

        const secret = user.two_factor_secret;
        if (!secret) {
            return NextResponse.json({ error: 'No 2FA secret found. Please restart setup.' }, { status: 400 });
        }

        // 3. Verify TOTP natively (Check current, previous, and next window to fix minor drift)
        const cleanCode = code.replace(/\s/g, '');
        const currentTime = Math.floor(Date.now() / 1000);

        const validCodes = [
            getTOTPForTime(secret, currentTime - 30),
            getTOTPForTime(secret, currentTime),
            getTOTPForTime(secret, currentTime + 30)
        ];

        const isValid = validCodes.includes(cleanCode);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid authentication code' }, { status: 401 });
        }

        // 4. Generate Recovery Codes
        const newCodes = generateRecoveryCodes(10);

        // 5. Enable 2FA for the user
        await db.update(users)
            .set({
                two_factor_enabled: true,
                updated_at: new Date()
            })
            .where(eq(users.id, user.id));

        // 6. Delete old recovery codes if they somehow existed, then insert new ones
        await db.delete(recoveryCodes).where(eq(recoveryCodes.user_id, user.id));

        const insertData = newCodes.map(c => ({
            user_id: user.id,
            code_hash: c.hash,
            used: false
        }));

        await db.insert(recoveryCodes).values(insertData);

        // 7. Return exactly once the RAW codes so the user can download them
        const rawRecoveryCodes = newCodes.map(c => c.raw);

        return NextResponse.json({
            success: true,
            recoveryCodes: rawRecoveryCodes
        });

    } catch (error: any) {
        console.error('2FA Verify Setup Error:', error);
        return NextResponse.json({ error: 'Failed to complete 2FA setup' }, { status: 500 });
    }
}
