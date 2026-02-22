import { db } from '@/lib/db';
import { capitalAccounts, users } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { getValidSession } from '@/lib/capital-service';
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
        const targetType = requestMode === 'real' ? 'live' : requestMode;
        const allAccounts = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId));
        const account = allAccounts.find(a => a.account_type === targetType) || allAccounts[0];

        if (!account) {
            return NextResponse.json({ error: 'Capital account not found' }, { status: 404 });
        }

        try {
            // Obtain valid session (Cached or Fresh)
            const isDemo = requestMode === 'demo';
            const session = await getValidSession(userId, isDemo);

            const executionResult = await placeOrder(session.cst, session.xSecurityToken, epic, direction, size, isDemo);
            return NextResponse.json(executionResult);

        } catch (err: any) {
            console.error("[Trade API] Capital.com Error:", err.message);

            if (err.message.includes("Session Expired") || err.message.includes("401") || err.message.includes("unauthorized")) {
                try {
                    const isDemo = requestMode === 'demo';
                    const session = await getValidSession(userId, isDemo, true);
                    const executionResult = await placeOrder(session.cst, session.xSecurityToken, epic, direction, size, isDemo);
                    return NextResponse.json(executionResult);
                } catch (retryErr: any) {
                    return NextResponse.json({ error: retryErr.message }, { status: 401 });
                }
            }

            return NextResponse.json({ error: err.message }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Trade API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
