import { db } from '@/lib/db';
import { capitalAccounts, users } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { createSession, placeOrder } from '@/lib/capital';
import { verifyAccessToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const cookieStore = cookies();
        const accessToken = (await cookieStore).get('access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = await verifyAccessToken(accessToken);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.userId;
        const body = await request.json();
        const { epic, direction, size, mode: requestMode = 'demo' } = body;

        if (!epic || !direction || !size) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch user for session
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Get appropriate account for session        
        const allAccounts = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId));
        const account = allAccounts.find(a => a.account_type === requestMode) || allAccounts[0];

        if (!account) {
            return NextResponse.json({ error: 'Capital account not found' }, { status: 404 });
        }

        const apiKey = decrypt(account.encrypted_api_key);
        const apiPassword = account.encrypted_api_password ? decrypt(account.encrypted_api_password) : null;

        if (!apiPassword) return NextResponse.json({ error: 'Password missing' }, { status: 400 });

        // Session creation
        const isDemo = account.account_type === 'demo';
        const session = await createSession(user.email, apiPassword, apiKey, isDemo);

        const executionResult = await placeOrder(session.cst, session.xSecurityToken, epic, direction, size, isDemo);

        return NextResponse.json(executionResult);

    } catch (error: any) {
        console.error('Trade API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
