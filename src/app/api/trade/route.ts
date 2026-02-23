import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getValidSession } from '@/lib/capital-service';
import { placeOrder } from '@/lib/capital';
import { verifyAccessToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = tokenPayload.userId;
        const body = await request.json();
        const {
            epic, direction, size,
            takeProfit, stopLoss, trailingStop,
            mode: requestMode = 'demo',
        } = body;

        if (!epic || !direction || !size) {
            return NextResponse.json({ error: 'Missing required fields: epic, direction, size' }, { status: 400 });
        }

        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const isDemo = requestMode === 'demo';

        const executeWithSession = async (forceRefresh = false) => {
            const session = await getValidSession(userId, isDemo, forceRefresh);
            const accountIsDemo = session.accountIsDemo ?? false;
            return placeOrder(
                session.cst, session.xSecurityToken,
                epic, direction, parseFloat(size),
                accountIsDemo,
                {
                    takeProfit: takeProfit ? parseFloat(takeProfit) : null,
                    stopLoss: stopLoss ? parseFloat(stopLoss) : null,
                    trailingStop: Boolean(trailingStop),
                }
            );
        };

        try {
            const result = await executeWithSession();
            return NextResponse.json({ success: true, ...result });
        } catch (err: any) {
            console.error('[Trade API] First attempt failed:', err.message);
            // Auto-retry with fresh session on auth errors
            if (err.message.includes('401') || err.message.toLowerCase().includes('session') || err.message.toLowerCase().includes('unauthorized')) {
                try {
                    const result = await executeWithSession(true);
                    return NextResponse.json({ success: true, ...result });
                } catch (retryErr: any) {
                    return NextResponse.json({ error: `Trade failed after retry: ${retryErr.message}` }, { status: 502 });
                }
            }
            return NextResponse.json({ error: err.message }, { status: 502 });
        }

    } catch (error: any) {
        console.error('[Trade API] Fatal error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
