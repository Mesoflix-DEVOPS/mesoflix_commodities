import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportAgents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { randomBytes } from 'crypto';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_must_change_in_prod'
);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const agents = await db.select().from(supportAgents).where(eq(supportAgents.email, email)).limit(1);
        const agent = agents[0];

        if (!agent) {
            return NextResponse.json({ error: "Invalid corporate credentials" }, { status: 401 });
        }

        if (!agent.is_active) {
            return NextResponse.json({ error: "Account suspended or inactive" }, { status: 403 });
        }

        const validPassword = await bcrypt.compare(password, agent.password_hash);
        if (!validPassword) {
            return NextResponse.json({ error: "Invalid corporate credentials" }, { status: 401 });
        }

        // Generate short-lived Temp Token for 2FA validation
        const tempToken = await new jose.SignJWT({ sub: agent.id })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('10m')
            .sign(JWT_SECRET);

        if (agent.two_factor_enabled) {
            return NextResponse.json({
                message: '2FA Verification Required',
                requires2FA: true,
                tempToken: tempToken
            });
        }

        // If not enabled, generate a new secret for setup
        const buffer = randomBytes(20);
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

        const otpauthUrl = `otpauth://totp/Mesoflix%20Support:${encodeURIComponent(agent.email)}?secret=${secret}&issuer=Mesoflix%20Support&algorithm=SHA1&digits=6&period=30`;

        await db.update(supportAgents)
            .set({ two_factor_secret: secret })
            .where(eq(supportAgents.id, agent.id));

        return NextResponse.json({
            message: '2FA Setup Required',
            setup2FA: true,
            secret,
            otpauthUrl,
            tempToken: tempToken
        });

    } catch (error) {
        console.error("Agent login error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
