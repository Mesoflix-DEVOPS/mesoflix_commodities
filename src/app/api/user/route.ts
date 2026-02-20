import { NextResponse } from 'next/server';
import { getAccounts } from '@/lib/capital';
import { decrypt } from '@/lib/crypto';
import db from '@/lib/db';
import { useSearchParams } from 'next/navigation';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-jwt-secret-key-change-me'
);

export async function GET(request: Request) {
    try {
        // 1. Verify Session
        const cookie = request.headers.get('cookie');
        const token = cookie?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        const email = payload.email as string;

        // 2. Get User Tokens from DB
        const stmt = db.prepare('SELECT encrypted_tokens FROM users WHERE email = ?');
        const user = stmt.get(email) as any;

        if (!user || !user.encrypted_tokens) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // 3. Decrypt Tokens
        const decrypted = decrypt(user.encrypted_tokens);
        const [cst, xSecurityToken] = decrypted.split(':');

        // 4. Fetch Accounts from Capital.com
        try {
            const accountsData = await getAccounts(cst, xSecurityToken);
            return NextResponse.json(accountsData);
        } catch (err: any) {
            if (err.message === "Session Expired") {
                // Needed: Refresh token logic or Re-login prompt
                // For now, return 401 so frontend redirects to login
                return NextResponse.json({ message: 'Session Expired' }, { status: 401 });
            }
            throw err;
        }

    } catch (error: any) {
        console.error('User API error:', error);
        return NextResponse.json(
            { message: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
