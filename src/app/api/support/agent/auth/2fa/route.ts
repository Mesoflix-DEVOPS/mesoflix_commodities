import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_must_change_in_prod'
);

function generateTOTP(secret: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const keyBytes = [];
    for (let i = 0; i < secret.length; i++) {
        const idx = alphabet.indexOf(secret[i].toUpperCase());
        if (idx === -1) continue;
        value = (value << 5) | idx;
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
    const res = hmac.digest();
    const offset = res[res.length - 1] & 0xf;
    const code = (((res[offset] & 0x7f) << 24) | ((res[offset + 1] & 0xff) << 16) | ((res[offset + 2] & 0xff) << 8) | (res[offset + 3] & 0xff)) % 1000000;
    return code.toString().padStart(6, '0');
}

export async function POST(req: Request) {
    try {
        const { totp, tempToken } = await req.json();
        if (!totp || !tempToken) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        let payload;
        try {
            const result = await jose.jwtVerify(tempToken, JWT_SECRET);
            payload = result.payload;
        } catch (e) {
            return NextResponse.json({ error: "Session expired" }, { status: 401 });
        }

        const agentId = payload.sub as string;

        // Institutional Bridge: Fetch Agent via stable SDK
        const { data: agent, error: agentError } = await supabase
            .from('support_agents')
            .select('*')
            .eq('id', agentId)
            .single();

        if (agentError || !agent || !agent.two_factor_secret) {
            return NextResponse.json({ error: "Identity Sync Failure" }, { status: 403 });
        }

        if (totp !== generateTOTP(agent.two_factor_secret)) {
            return NextResponse.json({ error: "Invalid authenticator code" }, { status: 401 });
        }

        if (!agent.two_factor_enabled) {
            await supabase.from('support_agents').update({ two_factor_enabled: true }).eq('id', agent.id);
        }

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
            maxAge: 12 * 60 * 60,
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error("Agent 2FA verification error:", error.message);
        return NextResponse.json({ error: "Security Bridge Offline" }, { status: 500 });
    }
}
