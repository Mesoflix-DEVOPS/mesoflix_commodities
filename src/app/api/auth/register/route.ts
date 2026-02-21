import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, refreshTokens, auditLogs, capitalAccounts } from '@/lib/db/schema';
import { hashPassword, encrypt } from '@/lib/crypto';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { createSession } from '@/lib/capital';
import { eq, or } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const { email, password, fullName, apiKey, apiPassword } = await request.json();
        console.log(`[Register] Attempting validation for: ${email}`);

        if (!email || !password || !apiKey || !apiPassword) {
            return NextResponse.json({ message: 'Email, Account Password, API Key, and API Password are required' }, { status: 400 });
        }

        // 1. Check if user already exists
        const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
        let user;

        // 2. Validate API Keys by attempting to create a session
        try {
            await createSession(email, apiPassword, apiKey);
        } catch (err: any) {
            console.error(`[Register] Capital.com Validation Failed for ${email}:`, err.message);
            return NextResponse.json({ message: `Capital.com validation failed: ${err.message}` }, { status: 401 });
        }

        // 3. Hash API Key for Uniqueness Check
        const { hashApiKey } = await import('@/lib/crypto');
        const keyHash = hashApiKey(apiKey);
        const existingAccountCount = await db.select().from(capitalAccounts).where(eq(capitalAccounts.api_key_hash, keyHash)).limit(1);
        if (existingAccountCount.length > 0) {
            // Check if it belongs to the same user
            if (existingUsers.length > 0 && existingAccountCount[0].user_id !== existingUsers[0].id) {
                return NextResponse.json({ message: 'This API key is already registered with another account' }, { status: 409 });
            }
        }

        // 4. Hash Account Password
        const passwordHash = await hashPassword(password);

        if (existingUsers.length > 0) {
            // Update existing user password
            [user] = await db.update(users).set({
                password_hash: passwordHash,
                full_name: fullName || existingUsers[0].full_name,
                updated_at: new Date(),
            }).where(eq(users.id, existingUsers[0].id)).returning();
        } else {
            // Create New User
            [user] = await db.insert(users).values({
                email,
                password_hash: passwordHash,
                full_name: fullName || 'Trading User',
            }).returning();
        }

        // 5. Store Encrypted Credentials
        const encryptedKey = encrypt(apiKey);
        const encryptedPass = encrypt(apiPassword);

        // Check if account entry exists
        const [existingAccount] = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, user.id)).limit(1);

        if (existingAccount) {
            await db.update(capitalAccounts).set({
                encrypted_api_key: encryptedKey,
                encrypted_api_password: encryptedPass,
                api_key_hash: keyHash,
                updated_at: new Date(),
            }).where(eq(capitalAccounts.id, existingAccount.id));
        } else {
            await db.insert(capitalAccounts).values({
                user_id: user.id,
                encrypted_api_key: encryptedKey,
                encrypted_api_password: encryptedPass,
                api_key_hash: keyHash,
                account_type: 'live',
            });
        }

        // 6. Issue Tokens
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

        // 9. Audit Log
        await db.insert(auditLogs).values({
            user_id: user.id,
            action: 'REGISTER',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json({
            message: 'Registration successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.full_name,
            }
        });

    } catch (error: any) {
        console.error('Registration Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
