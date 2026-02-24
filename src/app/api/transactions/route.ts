import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getValidSession } from '@/lib/capital-service';
import { getHistory } from '@/lib/capital';
import { verifyAccessToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';
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
        const timeframe = searchParams.get('timeframe') || 'ALL'; // 1D, 1W, 1M, YTD, ALL

        const isDemo = modeInput === 'demo';
        let session;
        try {
            session = await getValidSession(userId, isDemo);
        } catch (error: any) {
            return NextResponse.json({ error: 'Failed to retrieve trading session' }, { status: 500 });
        }

        // Always use LIVE endpoint; getValidSession handles account mode switching internally
        // Calculate Date Range
        const now = new Date();
        let fromDate = new Date(0); // Default to ALL

        if (timeframe === '1D') {
            fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (timeframe === '1W') {
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '1M') {
            fromDate = new Date(now.setMonth(now.getMonth() - 1));
        } else if (timeframe === 'YTD') {
            fromDate = new Date(now.getFullYear(), 0, 1);
        }

        // Fetch History (up to 500 items to give the user enough data to dig through)
        let historyData;
        try {
            historyData = await getHistory(session.cst, session.xSecurityToken, false, {
                from: fromDate.toISOString().split('.')[0],
                max: 500
            });
        } catch (err: any) {
            console.error('[Transactions API] Error fetching history:', err);
            return NextResponse.json({
                transactions: [],
                error: 'Failed to fetch transactions from broker'
            });
        }

        const activities = historyData?.activities || [];

        // Filter only actual closed trades (exclude internal broker system logs)
        const closedTrades = activities.filter((log: any) => {
            const status = log.status?.[0] || log.status;
            const desc = (log.description || "").toUpperCase();

            // We want closed trades or explicit money movements
            const isClosed = status === 'CLOSED' || desc.includes('CLOSE');
            const hasPnL = log.details?.profitAndLoss !== undefined || log.details?.pl !== undefined;

            return isClosed || hasPnL;
        });

        // Map them cleanly for the frontend table
        const formattedTransactions = closedTrades.map((trade: any) => {
            const pnl = trade.details?.profitAndLoss ?? trade.details?.pl ?? 0;
            const size = trade.details?.size ?? trade.size ?? null;
            const epic = trade.epic || trade.details?.epic || "Unknown Instrument";
            const channel = trade.channel || "Web";
            const desc = trade.description || "Position Closed";

            const isBuy = desc.toUpperCase().includes("BUY");
            const isSell = desc.toUpperCase().includes("SELL");
            const direction = isBuy ? "BUY" : isSell ? "SELL" : "—";

            return {
                id: trade.dealId || trade.date, // fallback to date if no ID
                date: trade.date,
                epic,
                direction,
                size,
                openPrice: trade.details?.openPrice ?? null,
                closePrice: trade.details?.closePrice ?? trade.details?.level ?? null,
                pnl,
                description: desc,
                channel
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
