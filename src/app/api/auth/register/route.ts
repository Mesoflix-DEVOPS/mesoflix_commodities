import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, refreshTokens, auditLogs } from '@/lib/db/schema';
import { hashPassword } from '@/lib/crypto';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const { email, password, fullName } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        // 1. Check if user exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
            return NextResponse.json({ message: 'User already exists' }, { status: 409 });
        }

        // 2. Hash Password
        const passwordHash = await hashPassword(password);

        // 3. Create User
        const [newUser] = await db.insert(users).values({
            email,
            password_hash: passwordHash,
            full_name: fullName,
        }).returning();

        // 4. Issue Tokens
        const accessToken = await signAccessToken({
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role || 'user',
            tokenVersion: newUser.token_version || 0,
        });

        const refreshToken = generateRefreshToken();

        // 5. Store Refresh Token
        await db.insert(refreshTokens).values({
            user_id: newUser.id,
            token_hash: refreshToken, // ideally hash this too, but for simplicity storing plain random token
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        // 6. Set Cookies
        await setAuthCookies(accessToken, refreshToken);

        // 7. Audit Log
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
