import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, desc, and, gte } from 'drizzle-orm';
import { automationTrades, closedTrades, users } from '@/lib/db/schema';
import { getValidSession } from '@/lib/capital-service';
import { verifyAccessToken } from '@/lib/auth';
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
        let normalTrades: any[] = [];
        let autoTrades: any[] = [];
        try {
            normalTrades = await db.select()
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

            autoTrades = await db.select()
                .from(automationTrades)
                .where(
                    and(
                        eq(automationTrades.user_id, userId),
                        eq(automationTrades.mode, isDemo ? 'demo' : 'live'),
                        eq(automationTrades.status, 'Closed'),
                        gte(automationTrades.updated_at, fromDate)
                    )
                )
                .orderBy(desc(automationTrades.updated_at))
                .limit(500);

        } catch (err: any) {
            console.error('[Transactions API] Error fetching history:', err);
            return NextResponse.json({
                transactions: [],
                error: 'Failed to fetch transactions from database'
            });
        }

        // Map them cleanly for the frontend table
        const formattedNormal = normalTrades.map((trade: any) => ({
            id: trade.deal_id,
            date: trade.created_at,
            epic: trade.epic,
            direction: trade.direction,
            size: parseFloat(trade.size),
            openPrice: parseFloat(trade.open_price),
            closePrice: parseFloat(trade.close_price),
            pnl: parseFloat(trade.pnl),
            description: `Manual Position Closed`,
            channel: "Web"
        }));

        const formattedAuto = autoTrades.map((trade: any) => ({
            id: trade.deal_id,
            date: trade.updated_at, // time it was closed
            epic: trade.epic,
            direction: trade.direction,
            size: parseFloat(trade.size),
            openPrice: parseFloat(trade.open_price),
            closePrice: parseFloat(trade.close_price),
            pnl: parseFloat(trade.pnl),
            description: `Automated Position Closed (${trade.engine_id})`,
            channel: "Bot"
        }));

        const combined = [...formattedNormal, ...formattedAuto].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({
            transactions: combined
        });

    } catch (error: any) {
        console.error('[Transactions API] Internal Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
