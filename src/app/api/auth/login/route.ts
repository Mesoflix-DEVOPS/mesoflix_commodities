import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, auditLogs, capitalAccounts, refreshTokens } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
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

        // 1. Find User (Direct SQL Failsafe)
        const result = await db.execute(sql`
            SELECT id, email, password_hash, role, token_version, full_name, two_factor_enabled 
            FROM users 
            WHERE email = ${email.toLowerCase()} 
            LIMIT 1
        `);
        
        const user = result.rows[0] as any;

        if (!user || !user.password_hash) {
            return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
        }

        // 2. Verify Password
        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            // Audit Log: Failed Login
            await db.insert(auditLogs).values({
                user_id: user.id,
                action: 'LOGIN_FAILED',
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            });
            return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
        }

        // 3. Optional Capital Account Retrieve (Drizzle)
        try {
            const [account] = await db.select()
                .from(capitalAccounts)
                .where(eq(capitalAccounts.user_id, user.id))
                .orderBy(desc(capitalAccounts.is_active))
                .limit(1);

            if (account) {
                const apiKey = decrypt(account.encrypted_api_key);
                const apiPassword = account.encrypted_api_password ? decrypt(account.encrypted_api_password) : password;
                const isDemo = account.account_type === 'demo';
                const identifier = account.capital_account_id || email;
                await createSession(identifier, apiPassword, apiKey, isDemo);
            }
        } catch (err: any) {
            console.error(`[Login] Non-blocking capital account failure for ${email}:`, err.message);
        }

        // 5. Update last login
        await db.update(users)
            .set({ last_login_at: new Date() })
            .where(eq(users.id, user.id));

        // 5.5 2FA Interception Logic
        if (user.two_factor_enabled) {
            const tempToken = await new SignJWT({ userId: user.id })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('5m')
                .sign(new TextEncoder().encode(process.env.JWT_SECRET));

            return NextResponse.json({
                message: '2FA Verification Required',
                requires2FA: true,
                tempToken: tempToken
            });
        }

        // 6. Issue App Tokens
        const accessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
            tokenVersion: user.token_version || 0,
        });

        const refreshToken = generateRefreshToken();

        // 7. Store Refresh Token
        await db.insert(refreshTokens).values({
            user_id: user.id,
            token_hash: refreshToken,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

        // 8. Set Cookies
        await setAuthCookies(accessToken, refreshToken);

        // 9. Audit Log: Success
        await db.insert(auditLogs).values({
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
