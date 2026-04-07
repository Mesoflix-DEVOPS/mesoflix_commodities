import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { comparePassword, decrypt } from '@/lib/crypto';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { createSession } from '@/lib/capital';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        // 1. Find User (Supabase SDK)
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .limit(1);
            
        const user = users?.[0];

        if (userError || !user || !user.password_hash) {
            return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
        }

        // 2. Verify Password (Unified Login Setup)
        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            // Audit Log: Failed Login (Supabase SDK)
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'LOGIN_FAILED',
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            });
            return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
        }

        // 3. Retrieve Capital Account Credentials (optional - not required for login)
        // 4. Attempt Capital.com Session (non-blocking - failure should not block login)
        // 3. Optional Capital Account Retrieve (Supabase SDK)
        let account = null;
        try {
            const { data: accs } = await supabase
                .from('capital_accounts')
                .select('*')
                .eq('user_id', user.id)
                .order('is_active', { ascending: false })
                .limit(1);
            account = accs?.[0];

            if (account) {
                const apiKey = decrypt(account.encrypted_api_key);
                const apiPassword = account.encrypted_api_password ? decrypt(account.encrypted_api_password) : password;
                const isDemo = account.account_type === 'demo';
                await createSession(email, apiPassword, apiKey, isDemo);
                console.log(`[Login] Capital.com session established for ${email}`);
            } else {
                console.log(`[Login] No Capital.com account linked for ${email} — will use master credentials for trading`);
            }
        } catch (err: any) {
            // Non-blocking catch-all for database or session initialization errors
            console.error(`[Login] Non-blocking capital account failure for ${email}:`, err.message);
        }

        // 5. Update last login (Supabase SDK)
        await supabase
            .from('users')
            .update({ last_login_at: new Date() })
            .eq('id', user.id);

        // 5.5 2FA Interception Logic (Bypassed for the automated debug account)
        if (user.two_factor_enabled && email !== 'lemicmelic@gmail.com') {
            // Generate a strictly short-lived 5-minute Temp Token containing only the userId
            const tempToken = await new SignJWT({ userId: user.id })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('5m')
                .sign(new TextEncoder().encode(process.env.JWT_SECRET || 'mesoflix-commodity-terminal-internal-fallback-v1'));

            return NextResponse.json({
                message: '2FA Verification Required',
                requires2FA: true,
                tempToken: tempToken
            });
        }

        // 6. Issue App Tokens (3-day persistence)
        const accessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
            tokenVersion: user.token_version || 0,
        });

        const refreshToken = generateRefreshToken();

        // 7. Store Refresh Token (3-day handshake)
        await supabase.from('refresh_tokens').insert({
            user_id: user.id,
            token_hash: refreshToken,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        });

        // 8. Set Cookies
        await setAuthCookies(accessToken, refreshToken);

        // 9. Audit Log: Success (Supabase SDK)
        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'LOGIN',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.full_name,
            }
        });

    } catch (error: any) {
        console.error('Login Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
