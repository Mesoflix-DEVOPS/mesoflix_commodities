import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        // 1. Verify Authentication
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userCookie = await verifyAccessToken(accessToken);
        if (!userCookie || !userCookie.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch User
        const [user] = await db.select().from(users).where(eq(users.id, userCookie.userId)).limit(1);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.two_factor_enabled) {
            return NextResponse.json({ error: 'Two-factor authentication is already enabled' }, { status: 400 });
        }

        // 3. Generate Secret via Base32 Math
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
        if (bits > 0) {
            secret += alphabet[(value << (5 - bits)) & 31];
        }

        // Generate otpauth URL using standard template strings
        const otpauthUrl = `otpauth://totp/Mesoflix%20Commodities:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Mesoflix%20Commodities&algorithm=SHA1&digits=6&period=30`;

        // 5. Save the temporary secret to the user's record (but keep 'enabled' false until verified)
        await db.update(users)
            .set({
                two_factor_secret: secret,
                updated_at: new Date()
            })
            .where(eq(users.id, user.id));

        return NextResponse.json({
            secret,
            otpauthUrl
        });

    } catch (error: any) {
        console.error('2FA Generate Error:', error);
        return NextResponse.json({ error: 'Failed to initialize 2FA setup' }, { status: 500 });
    }
}
