import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, refreshTokens, recoveryCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { signAccessToken, setAuthCookies, generateRefreshToken } from '@/lib/auth';
import { jwtVerify } from 'jose';

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
        const { tempToken, code, isRecoveryMode } = await req.json();

        if (!tempToken || !code) {
            return NextResponse.json({ error: 'Missing token or verification code' }, { status: 400 });
        }

        // 1. Verify the Short-Lived Temp Token
        let payload;
        try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'mesoflix-commodity-terminal-internal-fallback-v1');
            const verified = await jwtVerify(tempToken, secret);
            payload = verified.payload;
        } catch (e) {
            return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
        }

        const userId = payload.userId as string;

        // 2. Fetch User & Secret
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (!user || (!user.two_factor_secret && !user.two_factor_enabled)) {
            return NextResponse.json({ error: '2FA is not enabled for this user' }, { status: 400 });
        }

        let isVerified = false;

        // 3a. Branch: Recovery Mode Logic
        if (isRecoveryMode) {
            const cleanCode = code.toUpperCase().trim();
            const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

            // Check all active codes for this user
            const codes = await db.select().from(recoveryCodes)
                .where(eq(recoveryCodes.user_id, userId));

            for (const rc of codes) {
                if (!rc.used && rc.code_hash === inputHash) {
                    isVerified = true;
                    // Invalidate this singular backup code so it can't be replayed
                    await db.update(recoveryCodes)
                        .set({ used: true })
                        .where(eq(recoveryCodes.id, rc.id));
                    break;
                }
            }

            if (!isVerified) {
                return NextResponse.json({ error: 'Invalid or already used recovery code' }, { status: 401 });
            }
        }

        // 3b. Branch: Standard Authenticator App TOTP Logic
        else {
            const cleanCode = code.replace(/\s/g, '');
            const currentTime = Math.floor(Date.now() / 1000);

            const validCodes = [
                getTOTPForTime(user.two_factor_secret!, currentTime - 30),
                getTOTPForTime(user.two_factor_secret!, currentTime),
                getTOTPForTime(user.two_factor_secret!, currentTime + 30)
            ];

            isVerified = validCodes.includes(cleanCode);

            if (!isVerified) {
                return NextResponse.json({ error: 'Invalid authentication code' }, { status: 401 });
            }
        }

        // 4. Verification Passed -> Generate REAL session tokens
        const newRefreshToken = generateRefreshToken();

        await db.insert(refreshTokens).values({
            user_id: user.id,
            token_hash: crypto.createHash('sha256').update(newRefreshToken).digest('hex'),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            device_info: req.headers.get('user-agent') || 'Unknown Device',
        });

        const accessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role ?? 'user',
            tokenVersion: user.token_version ?? 0,
        });

        await setAuthCookies(accessToken, newRefreshToken);

        return NextResponse.json({
            message: 'Login successful via 2FA',
            redirectUrl: '/dashboard',
        });

    } catch (error: any) {
        console.error('2FA Verify Login Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
