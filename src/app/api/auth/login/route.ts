import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, refreshTokens, auditLogs } from '@/lib/db/schema';
import { comparePassword } from '@/lib/crypto';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        // 1. Find User
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
        }

        // 2. Verify Password
        const isValid = await comparePassword(password, user.password_hash);

        if (!isValid) {
            // Audit Log: Failed Login
            await db.insert(auditLogs).values({
                action: 'LOGIN_FAILED',
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            });
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
        }

        // 3. Issue Tokens
        const accessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
            tokenVersion: user.token_version || 0,
        });

        const refreshToken = generateRefreshToken();

        // 4. Store Refresh Token
        await db.insert(refreshTokens).values({
            user_id: user.id,
            token_hash: refreshToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        // 5. Update Last Login
        await db.update(users).set({ last_login_at: new Date() }).where(eq(users.id, user.id));

        // 6. Set Cookies
        await setAuthCookies(accessToken, refreshToken);

        // 7. Audit Log: Success
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
