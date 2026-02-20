import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, refreshTokens, auditLogs, systemSettings, capitalAccounts } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { createSession } from '@/lib/capital';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const { email, password, apiKey } = await request.json();

        if (!email || !password || !apiKey) {
            return NextResponse.json({ message: 'Email, password, and API Key are required' }, { status: 400 });
        }

        // 1. Authenticate with Capital.com using Provided Credentials
        let session;
        try {
            session = await createSession(email, password, apiKey);
        } catch (err: any) {
            console.error("Capital Login Failed:", err.message);
            // Audit Log: Failed Login
            await db.insert(auditLogs).values({
                action: 'LOGIN_FAILED',
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            });
            return NextResponse.json({ message: `Capital.com Login Failed: ${err.message}` }, { status: 401 });
        }

        // 2. Find or Create User
        let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user) {
            [user] = await db.insert(users).values({
                email,
                // No password_hash needed for passthrough auth
                full_name: 'Capital User',
                role: 'user',
                email_verified: true,
            }).returning();
        } else {
            await db.update(users).set({ last_login_at: new Date() }).where(eq(users.id, user.id));
        }

        // 3. Store Capital Session AND API Key (Encrypted)
        const { encrypt } = await import('@/lib/crypto');
        // We store the CST/XST session tokens primarily, but for "Option A", the user might expect us to reuse the API Key for future sessions if the token expires.
        // However, standard practice with Capital.com is CST/XST.
        // Let's store the API Key as well in the encrypted blob if we want to support auto-relogin, OR just stick to session tokens.
        // Given the requirement "users enter their api keys", we should PROBABLY store the API Key so we don't ask for it every time if session invalidates?
        // Actually, let's just store the session tokens for now. If they expire, user logs in again.
        // Wait, if we want to enable "Trading" later, we might need the API Key again?
        // Capital.com API usually needs CST/XST for subsequent requests. API Key is for session creation.
        // Let's store the API Key in the encrypted blob too, just in case.

        const sessionData = JSON.stringify({
            cst: session.cst,
            xSecurityToken: session.xSecurityToken,
            apiKey: apiKey // Storing API Key to allow potential re-authentication or specific endpoints if needed
        });
        const encryptedSession = encrypt(sessionData);

        // Check if account entry exists
        const [existingAccount] = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, user.id)).limit(1);

        if (existingAccount) {
            await db.update(capitalAccounts).set({
                encrypted_api_key: encryptedSession, // Reusing field
                updated_at: new Date()
            }).where(eq(capitalAccounts.id, existingAccount.id));
        } else {
            await db.insert(capitalAccounts).values({
                user_id: user.id,
                encrypted_api_key: encryptedSession,
                account_type: 'live',
            });
        }


        // 5. Issue App Tokens
        const accessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
            tokenVersion: user.token_version || 0,
        });

        const refreshToken = generateRefreshToken();

        // 6. Store Refresh Token
        await db.insert(refreshTokens).values({
            user_id: user.id,
            token_hash: refreshToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        // 7. Set Cookies
        await setAuthCookies(accessToken, refreshToken);

        // 8. Audit Log: Success
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
