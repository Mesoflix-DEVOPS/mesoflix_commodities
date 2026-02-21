import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, refreshTokens, auditLogs, capitalAccounts } from '@/lib/db/schema';
import { hashPassword, encrypt } from '@/lib/crypto';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { createSession } from '@/lib/capital';
import { eq, or } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const { email, password, fullName, apiKey } = await request.json();
        console.log(`[Register] Attempting validation for: ${email}`);

        if (!email || !password || !apiKey) {
            return NextResponse.json({ message: 'Email, password, and API Key are required' }, { status: 400 });
        }

        // 1. Check if user already exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
            return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
        }

        // 2. Validate API Key by attempting to create a session
        try {
            await createSession(email, password, apiKey);
        } catch (err: any) {
            console.error(`[Register] Capital.com Validation Failed for ${email}:`, err.message);
            return NextResponse.json({ message: `Capital.com validation failed: ${err.message}` }, { status: 401 });
        }

        // 3. Hash API Key for Uniqueness Check
        const { hashApiKey } = await import('@/lib/crypto');
        const keyHash = hashApiKey(apiKey);
        const existingAccountCount = await db.select().from(capitalAccounts).where(eq(capitalAccounts.api_key_hash, keyHash)).limit(1);
        if (existingAccountCount.length > 0) {
            return NextResponse.json({ message: 'This API key is already registered with another account' }, { status: 409 });
        }

        // 4. Hash Password
        const passwordHash = await hashPassword(password);

        // 5. Create User
        const [newUser] = await db.insert(users).values({
            email,
            password_hash: passwordHash,
            full_name: fullName || 'Trading User',
        }).returning();

        // 6. Store Encrypted API Key and Hash
        const encryptedKey = encrypt(apiKey);
        await db.insert(capitalAccounts).values({
            user_id: newUser.id,
            encrypted_api_key: encryptedKey,
            api_key_hash: keyHash,
            account_type: 'live',
        });

        // 6. Issue Tokens
        const accessToken = await signAccessToken({
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role || 'user',
            tokenVersion: newUser.token_version || 0,
        });

        const refreshToken = generateRefreshToken();

        // 7. Store Refresh Token (3 days)
        await db.insert(refreshTokens).values({
            user_id: newUser.id,
            token_hash: refreshToken,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        });

        // 8. Set Cookies
        await setAuthCookies(accessToken, refreshToken);

        // 9. Audit Log
        await db.insert(auditLogs).values({
            user_id: newUser.id,
            action: 'REGISTER',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json({
            message: 'Registration successful',
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.full_name,
            }
        });

    } catch (error: any) {
        console.error('Registration Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
