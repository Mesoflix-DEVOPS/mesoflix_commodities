import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, refreshTokens, auditLogs, systemSettings, capitalAccounts } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { createSession } from '@/lib/capital';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        // 1. Get Master API Key
        const [masterSettings] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'capital_master_credentials')).limit(1);

        if (!masterSettings) {
            return NextResponse.json({ message: 'System not configured (Missing Master Credentials)' }, { status: 503 });
        }

        // Decrypt Master Credentials to get API Key
        let apiKey = "";
        try {
            // masterSettings.value is encrypted JSON { login, password, apiKey }
            // For now we assume we need the API Key from here.
            // But wait, the previous script stored it as encrypted JSON. 
            // We need to import decrypt.
            const { decrypt } = await import('@/lib/crypto');
            const creds = JSON.parse(decrypt(masterSettings.value));
            apiKey = creds.apiKey;
        } catch (e) {
            console.error("Failed to decrypt master credentials", e);
            return NextResponse.json({ message: 'System configuration error' }, { status: 500 });
        }

        // 2. Authenticate with Capital.com
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

        // 3. Find or Create User
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

        // 4. Store Capital Session (Encrypted)
        const sessionData = JSON.stringify({ cst: session.cst, xSecurityToken: session.xSecurityToken });
        const { encrypt } = await import('@/lib/crypto');
        const encryptedSession = encrypt(sessionData);

        // Check if account entry exists
        const [existingAccount] = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, user.id)).limit(1);

        if (existingAccount) {
            await db.update(capitalAccounts).set({
                encrypted_api_key: encryptedSession, // Reusing field for session tokens
                updated_at: new Date()
            }).where(eq(capitalAccounts.id, existingAccount.id));
        } else {
            await db.insert(capitalAccounts).values({
                user_id: user.id,
                encrypted_api_key: encryptedSession,
                account_type: 'live', // derived from session?
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
