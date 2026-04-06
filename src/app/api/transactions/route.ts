import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
        const fromDate: string = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        // 1. Fetch Manual Trades from Supabase (History)
        const { data: normalTrades, error: normalError } = await supabase
            .from('closed_trades')
            .select('*')
            .eq('user_id', userId)
            .eq('mode', modeInput)
            .gte('created_at', fromDate)
            .order('created_at', { ascending: false })
            .limit(500);

        // 2. Fetch Automated Trades from Supabase (Automation)
        const { data: autoTrades, error: autoError } = await supabase
            .from('automation_trades')
            .select('*')
            .eq('user_id', userId)
            .eq('mode', modeInput)
            .eq('status', 'Closed')
            .gte('updated_at', fromDate)
            .order('updated_at', { ascending: false })
            .limit(500);

        if (normalError || autoError) {
            console.error('[Transactions API] Sync Failure:', normalError?.message || autoError?.message);
            return NextResponse.json({
                transactions: [],
                error: 'History Synchronization Lag'
            });
        }

        // Map them cleanly for the frontend table
        const formattedNormal = (normalTrades || []).map((trade: any) => ({
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

        const formattedAuto = (autoTrades || []).map((trade: any) => ({
            id: trade.deal_id,
            date: trade.updated_at,
            epic: trade.epic,
            direction: trade.direction,
            size: parseFloat(trade.size),
            openPrice: parseFloat(trade.open_price),
            closePrice: parseFloat(trade.close_price),
            pnl: parseFloat(trade.pnl),
            description: `Automated Position Closed (${trade.engine_id})`,
            channel: "Bot"
        }));

        const combined = [...formattedNormal, ...formattedAuto]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({ transactions: combined });

    } catch (error: any) {
        console.error('[Transactions API] Fatal Error:', error.message);
        return NextResponse.json({ message: 'History Bridge Offline' }, { status: 500 });
    }
}
