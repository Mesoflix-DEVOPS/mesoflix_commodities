import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';

const DEFAULT_EPICS = ['GOLD', 'OIL_CRUDE', 'BTCUSD', 'NATGAS'];

const LABELS: Record<string, string> = {
    GOLD: 'Gold',
    OIL_CRUDE: 'Crude Oil',
    BTCUSD: 'BTC/USD',
    NATGAS: 'Natural Gas',
};

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'real';
        const RENDER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

        // Proxy request to Render Centralized Sentiment Engine
        const res = await fetch(`${RENDER_URL}/api/sentiment?mode=${mode}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
             const errData = await res.json().catch(() => ({}));
             return NextResponse.json({ 
                 sentiments: buildNeutral(DEFAULT_EPICS), 
                 warning: errData.error || 'Bridge Connection Lag' 
             });
        }

        const data = await res.json();
        return NextResponse.json({ sentiments: data.sentiments || [] });

    } catch (err: any) {
        console.error('[Sentiment Proxy] Failed:', err.message);
        return NextResponse.json({ sentiments: buildNeutral(DEFAULT_EPICS), warning: 'Institutional Link Timeout' });
    }
}

function buildNeutral(epics: string[]) {
    return epics.map(epic => ({
        epic, label: LABELS[epic] || epic,
        longPct: 50, shortPct: 50, bias: 'NEUTRAL',
    }));
}
