import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, closedTrades } from '@/lib/db/schema';
import { getValidSession } from '@/lib/capital-service';
import { verifyAccessToken } from '@/lib/auth';
import { eq, desc, and, gte } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) {
            return NextResponse.json({ message: 'Unauthorized: Session Invalid' }, { status: 401 });
        }

        const userId = tokenPayload.userId;

        const { searchParams } = new URL(request.url);
        const modeInput = searchParams.get('mode') || 'demo';
        const isDemo = modeInput === 'demo';

        // Calculate Date Range (Strictly set to rolling 24-hours)
        const now = new Date();
        const fromDate: Date = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Fetch History from our internal tables
        let historyData: any[] = [];
        try {
            historyData = await db.select()
                .from(closedTrades)
                .where(
                    and(
                        eq(closedTrades.user_id, userId),
                        eq(closedTrades.mode, isDemo ? 'demo' : 'live'),
                        gte(closedTrades.created_at, fromDate)
                    )
                )
                .orderBy(desc(closedTrades.created_at))
                .limit(500);
        } catch (err: any) {
            console.error('[Transactions API] Error fetching history:', err);
            return NextResponse.json({
                transactions: [],
                error: 'Failed to fetch transactions from database'
            });
        }

        // Map them cleanly for the frontend table
        const formattedTransactions = historyData.map((trade: any) => {
            return {
                id: trade.deal_id,
                date: trade.created_at,
                epic: trade.epic,
                direction: trade.direction,
                size: parseFloat(trade.size),
                openPrice: parseFloat(trade.open_price),
                closePrice: parseFloat(trade.close_price),
                pnl: parseFloat(trade.pnl),
                description: `Position Closed`,
                channel: "Web" // default
            };
        });

        return NextResponse.json({
            transactions: formattedTransactions
        });

    } catch (error: any) {
        console.error('[Transactions API] Internal Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
