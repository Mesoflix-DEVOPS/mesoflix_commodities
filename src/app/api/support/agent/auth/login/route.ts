import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { randomBytes } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_must_change_in_prod'
);

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Institutional Bridge: Fetch Agent via stable SDK
        const { data: agent, error: agentError } = await supabase
            .from('support_agents')
            .select('*')
            .eq('email', email)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: "Invalid corporate credentials" }, { status: 401 });
        }

        if (!agent.is_active) {
            return NextResponse.json({ error: "Account suspended or inactive" }, { status: 403 });
        }

        const validPassword = await bcrypt.compare(password, agent.password_hash);
        if (!validPassword) {
            return NextResponse.json({ error: "Invalid corporate credentials" }, { status: 401 });
        }

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

        // John's special access: Allow direct login if 2FA disabled
        if (!agent.two_factor_enabled && agent.email === 'john@gmail.com') {
            const sessionToken = await new jose.SignJWT({
                sub: agent.id,
                email: agent.email,
                role: agent.role
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('24h')
                .sign(JWT_SECRET);

            const response = NextResponse.json({ success: true, message: 'Login successful' });
            response.cookies.set('agent_session', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 
            });
            return response;
        }

        // Generate 2FA Secret via stable SDK logic
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
        if (bits > 0) secret += alphabet[(value << (5 - bits)) & 31];

        const otpauthUrl = `otpauth://totp/Mesoflix%20Support:${encodeURIComponent(agent.email)}?secret=${secret}&issuer=Mesoflix%20Support&algorithm=SHA1&digits=6&period=30`;

        await supabase.from('support_agents').update({ two_factor_secret: secret }).eq('id', agent.id);

        return NextResponse.json({
            message: '2FA Setup Required',
            setup2FA: true,
            secret,
            otpauthUrl,
            tempToken: tempToken
        });

    } catch (error: any) {
        console.error("Agent login error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
