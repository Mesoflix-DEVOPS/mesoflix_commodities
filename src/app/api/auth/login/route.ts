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

        // 3. Retrieve Capital Account Credentials
        const [account] = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, user.id)).limit(1);

        if (!account) {
            return NextResponse.json({ message: 'Capital.com account not linked. Please register again.' }, { status: 404 });
        }

        // Since the site password IS the API password now, we can use it directly
        // or decrypt the stored one to be absolutely sure. Decrypting is safer 
        // in case the user changed their Capital password but not their Mesoflix one 
        // (though we try to keep them sync'd now).
        const apiKey = decrypt(account.encrypted_api_key);
        const apiPassword = account.encrypted_api_password ? decrypt(account.encrypted_api_password) : password;

        // 4. Establish Capital.com Session
        let session;
        try {
            const isDemo = account.account_type === 'demo';
            session = await createSession(email, apiPassword, apiKey, isDemo);
        } catch (err: any) {
            console.error(`[Login] Capital.com Session Failed for ${email}:`, err.message);
            // If the provided password worked for the site but failed for Capital, 
            // the credentials might be out of sync.
            return NextResponse.json({ message: 'Capital.com authentication failed. Your trading password may have changed.' }, { status: 401 });
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
