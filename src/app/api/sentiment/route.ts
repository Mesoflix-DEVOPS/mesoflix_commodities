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

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'real';
        const isDemo = mode === 'demo';

        // Institutional Bridge: Fetch session via stable SDK
        const session = await getValidSession(tokenPayload.userId, isDemo);
        const API_URL = LIVE_API;

        const epicsParam = searchParams.get('epics');
        const epics = epicsParam ? epicsParam.split(',') : DEFAULT_EPICS;

        let sentiments = await fetchCapitalSentiment(API_URL, session.cst, session.xSecurityToken, epics);

        if (sentiments.length === 0) {
            console.log('[Sentiment API] Falling back to snapshot-derived sentiment...');
            sentiments = await fetchSnapshotSentiment(API_URL, session.cst, session.xSecurityToken, epics);
        }

        return NextResponse.json({ sentiments });

    } catch (err: any) {
        console.error('[Sentiment API] Fatal error:', err.message);
        return NextResponse.json({ sentiments: buildNeutral(DEFAULT_EPICS), warning: 'Bridge Lag Detected' });
    }
}

async function fetchCapitalSentiment(
    baseUrl: string, cst: string, xst: string, epics: string[]
): Promise<any[]> {
    try {
        const res = await fetch(`${baseUrl}/clientsentiment?epics=${epics.join(',')}`, {
            headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst },
            signal: AbortSignal.timeout(7000),
        });

        if (!res.ok) return [];

        const data = await res.json();
        const raw: any[] = data?.clientSentiments || [];
        if (raw.length === 0) return [];

        return raw.map((item: any) => {
            const longPct = Math.round(parseFloat(item.longPositionPercentage) || 50);
            const shortPct = 100 - longPct;
            const bias = longPct > 55 ? 'BULLISH' : longPct < 45 ? 'BEARISH' : 'NEUTRAL';
            const epic = item.instrumentName || '';
            return { epic, label: LABELS[epic] || epic, longPct, shortPct, bias };
        });

    } catch { return []; }
}

async function fetchSnapshotSentiment(
    baseUrl: string, cst: string, xst: string, epics: string[]
): Promise<any[]> {
    try {
        const res = await fetch(`${baseUrl}/markets?epics=${epics.join(',')}`, {
            headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst },
            signal: AbortSignal.timeout(7000),
        });

        if (!res.ok) return buildNeutral(epics);
        const data = await res.json();
        const details: any[] = data?.marketDetails || [];
        if (details.length === 0) return buildNeutral(epics);

        return details.map((m: any) => {
            const epic = m?.instrument?.epic || '';
            const pctChange = m?.snapshot?.percentageChange ?? 0;
            const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
            const rawLong = 50 + clamp(pctChange * 5, -45, 45);
            const longPct = Math.round(rawLong);
            const bias = longPct > 55 ? 'BULLISH' : longPct < 45 ? 'BEARISH' : 'NEUTRAL';
            return { epic, label: LABELS[epic] || epic, longPct, shortPct: 100 - longPct, bias, derived: true };
        });
    } catch { return buildNeutral(epics); }
}

function buildNeutral(epics: string[]) {
    return epics.map(epic => ({
        epic, label: LABELS[epic] || epic,
        longPct: 50, shortPct: 50, bias: 'NEUTRAL',
    }));
}
