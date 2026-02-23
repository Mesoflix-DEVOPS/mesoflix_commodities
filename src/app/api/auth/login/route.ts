import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, refreshTokens, auditLogs, capitalAccounts } from '@/lib/db/schema';
import { comparePassword, decrypt } from '@/lib/crypto';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { createSession } from '@/lib/capital';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        // 1. Find User
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user || !user.password_hash) {
            return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
        }

        // 2. Verify Password (which is also the API Password)
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

        // 3. Retrieve Capital Account Credentials (optional - not required for login)
        const [account] = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, user.id)).limit(1);

        // 4. Attempt Capital.com Session (non-blocking - failure should not block login)
        if (account) {
            try {
                const apiKey = decrypt(account.encrypted_api_key);
                const apiPassword = account.encrypted_api_password ? decrypt(account.encrypted_api_password) : password;
                const isDemo = account.account_type === 'demo';
                await createSession(email, apiPassword, apiKey, isDemo);
                console.log(`[Login] Capital.com session established for ${email}`);
            } catch (err: any) {
                // Non-blocking: log but do NOT fail login
                console.warn(`[Login] Capital.com session failed for ${email} (non-blocking): ${err.message}`);
            }
        } else {
            console.log(`[Login] No Capital.com account linked for ${email} — will use master credentials for trading`);
        }

        // 5. Update last login
        await db.update(users).set({ last_login_at: new Date() }).where(eq(users.id, user.id));

        // 6. Issue App Tokens (3-day persistence)
        const accessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
            tokenVersion: user.token_version || 0,
        });

        const refreshToken = generateRefreshToken();

        // 7. Store Refresh Token (3 days)
        await db.insert(refreshTokens).values({
            user_id: user.id,
            token_hash: refreshToken,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
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
