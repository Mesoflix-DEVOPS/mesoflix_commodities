import { NextResponse } from 'next/server';
import { loginCapitalCom } from '@/lib/capital';
import { encrypt } from '@/lib/crypto';
import db from '@/lib/db';
import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-jwt-secret-key-change-me'
);

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
                { status: 400 }
            );
        }

        // 1. Authenticate with Capital.com
        const capitalData = await loginCapitalCom(email, password);

        const { cst, xSecurityToken, clientId } = capitalData;

        if (!cst || !xSecurityToken) {
            return NextResponse.json(
                { message: 'Failed to retrieve session tokens from Capital.com' },
                { status: 401 }
            );
        }

        // 2. Encrypt tokens
        const encryptedTokens = encrypt(`${cst}:${xSecurityToken}`);

        // 3. Store/Update user in DB
        // We use the email/clientId as unique identifier
        const userId = clientId || uuidv4();
        const stmt = db.prepare(`
      INSERT INTO users (id, capital_user_id, name, email, encrypted_tokens, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET
        encrypted_tokens = excluded.encrypted_tokens,
        updated_at = excluded.updated_at
    `);

        stmt.run(uuidv4(), userId, email, email, encryptedTokens); // Using email as name for now if not provided

        // 4. Create JWT Session
        const token = await new SignJWT({ email, userId })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('2h')
            .sign(JWT_SECRET);

        // 5. Return success with cookie
        const response = NextResponse.json({
            message: 'Login successful',
            user: {
                email,
                name: email, // Capital.com might return name, but typically it returns account details.
            }
        });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7200, // 2 hours
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            { message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
