import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportAgents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_must_change_in_prod'
);

function generateTOTP(secret: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const keyBytes = [];

    for (let i = 0; i < secret.length; i++) {
        value = (value << 5) | alphabet.indexOf(secret[i].toUpperCase());
        bits += 5;
        if (bits >= 8) {
            keyBytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    const counter = Math.floor(Date.now() / 30000);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter), 0);

    const hmac = crypto.createHmac('sha1', Buffer.from(keyBytes));
    hmac.update(counterBuffer);
    const hmacResult = hmac.digest();

    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const code = (
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff)
    ) % 1000000;

    return code.toString().padStart(6, '0');
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { totp, tempToken } = body;

        if (!totp || !tempToken) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify Temp Token
        let payload;
        try {
            const result = await jose.jwtVerify(tempToken, JWT_SECRET);
            payload = result.payload;
        } catch (e) {
            return NextResponse.json({ error: "Session expired, please login again" }, { status: 401 });
        }

        const agentId = payload.sub as string;

        const agents = await db.select().from(supportAgents).where(eq(supportAgents.id, agentId)).limit(1);
        const agent = agents[0];

        if (!agent || !agent.two_factor_secret) {
            return NextResponse.json({ error: "Invalid agent or 2FA not initialized" }, { status: 403 });
        }

        const validTotp = generateTOTP(agent.two_factor_secret);

        if (totp !== validTotp) {
            return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 });
        }

        // If it was setup phase, permanently enable it
        if (!agent.two_factor_enabled) {
            await db.update(supportAgents)
                .set({ two_factor_enabled: true })
                .where(eq(supportAgents.id, agent.id));
        }

        // Generate Final JWT
        const token = await new jose.SignJWT({
            sub: agent.id,
            email: agent.email,
            role: agent.role,
            type: 'support_agent'
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('12h')
            .sign(JWT_SECRET);

        const response = NextResponse.json({
            success: true,
            agent: { id: agent.id, email: agent.email, role: agent.role, name: agent.full_name }
        });

        response.cookies.set('agent_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60, // 12 hours
            path: '/',
        });

        return response;

    } catch (error) {
        console.error("Agent 2FA verification error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
