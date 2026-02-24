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
        const timeframe = searchParams.get('timeframe') || 'ALL'; // 1W, 1M, 3M, YTD, ALL

        const isDemo = modeInput === 'demo';
        let session;
        try {
            session = await getValidSession(userId, isDemo);
        } catch (error: any) {
            return NextResponse.json({ error: 'Failed to retrieve trading session' }, { status: 500 });
        }

        const apiIsDemo = session.accountIsDemo ?? isDemo;

        // Calculate Date Range
        const now = new Date();
        let fromDate = new Date(0); // Default to beginning of time

        if (timeframe === '1W') {
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '1M') {
            fromDate = new Date(now.setMonth(now.getMonth() - 1));
        } else if (timeframe === '3M') {
            fromDate = new Date(now.setMonth(now.getMonth() - 3));
        } else if (timeframe === 'YTD') {
            fromDate = new Date(now.getFullYear(), 0, 1);
        }

        // Fetch History (up to 500 items for deeper analytics)
        let historyData;
        try {
            historyData = await getHistory(session.cst, session.xSecurityToken, apiIsDemo, {
                from: fromDate.toISOString().split('.')[0],
                max: 500
            });
        } catch (err: any) {
            console.error('[Analytics API] Error fetching history:', err);
            return NextResponse.json({
                winRate: 0,
                grossProfit: 0,
                grossLoss: 0,
                netProfit: 0,
                totalTrades: 0,
                equityCurve: [],
                error: 'Failed to fetch history from broker'
            });
        }

        const activities = historyData?.activities || [];

        // Filter only actual closed trades (where P/L is realized)
        const closedTrades = activities.filter((log: any) =>
            log.status === 'CLOSED' ||
            log.status?.[0] === 'CLOSED' ||
            (log.details?.profitAndLoss !== undefined && log.details?.profitAndLoss !== null) ||
            (log.details?.pl !== undefined && log.details?.pl !== null)
        );

        let wins = 0;
        let losses = 0;
        let grossProfit = 0;
        let grossLoss = 0;

        // Process trades sequentially to build an equity curve
        // Assuming activities come back newest first, we reverse to go oldest to newest for the curve
        const chronologicalTrades = [...closedTrades].reverse();

        let cumulativeEquity = 0; // Starts from 0 relative to this period
        const equityCurve: any[] = [];

        chronologicalTrades.forEach((trade: any) => {
            const pnl = trade.details?.profitAndLoss ?? trade.details?.pl ?? 0;

            // Skip zero PNL non-trades
            if (pnl === 0 && !trade.description?.includes('CLOSE')) return;

            if (pnl > 0) {
                wins++;
                grossProfit += pnl;
            } else if (pnl < 0) {
                losses++;
                grossLoss += Math.abs(pnl);
            }

            cumulativeEquity += pnl;

            equityCurve.push({
                time: trade.date,
                cumulative: cumulativeEquity,
                pnl: pnl
            });
        });

        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const netProfit = grossProfit - grossLoss;

        return NextResponse.json({
            winRate,
            grossProfit,
            grossLoss,
            netProfit,
            totalTrades,
            wins,
            losses,
            equityCurve
        });

    } catch (error: any) {
        console.error('[Analytics API] Internal Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
