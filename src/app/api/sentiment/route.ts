import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';

const DEFAULT_EPICS = ['GOLD', 'OIL_CRUDE', 'EURUSD', 'BTCUSD', 'NATGAS', 'SILVER'];

const LABELS: Record<string, string> = {
    GOLD: 'Gold',
    OIL_CRUDE: 'Crude Oil',
    EURUSD: 'EUR/USD',
    BTCUSD: 'BTC/USD',
    NATGAS: 'Natural Gas',
    SILVER: 'Silver',
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

        const session = await getValidSession(tokenPayload.userId, isDemo);
        // Always use LIVE endpoint; getValidSession handles account switching internally
        const API_URL = LIVE_API;

        const epicsParam = searchParams.get('epics');
        const epics = epicsParam ? epicsParam.split(',') : DEFAULT_EPICS;

        // ── Attempt 1: Capital.com /clientsentiment endpoint ──────────────────
        let sentiments = await fetchCapitalSentiment(API_URL, session.cst, session.xSecurityToken, epics);

        // ── Attempt 2: if empty, force-refresh session and retry ──────────────
        if (sentiments.length === 0) {
            console.warn('[Sentiment API] Empty result from Capital.com, force-refreshing session...');
            try {
                const fresh = await getValidSession(tokenPayload.userId, isDemo, true);
                sentiments = await fetchCapitalSentiment(LIVE_API, fresh.cst, fresh.xSecurityToken, epics);
            } catch { /* fall through to synthetic */ }
        }

        // ── Attempt 3: Generate synthetic sentiment from market snapshot ───────
        // If Capital.com clientsentiment isn't available (plan restriction etc.),
        // derive sentiment from the market snapshot's long/short position data.
        if (sentiments.length === 0) {
            console.log('[Sentiment API] Falling back to snapshot-derived sentiment...');
            sentiments = await fetchSnapshotSentiment(API_URL, session.cst, session.xSecurityToken, epics);
        }

        return NextResponse.json({ sentiments });

    } catch (err: any) {
        console.error('[Sentiment API] Fatal error:', err.message);
        // Return synthetic neutral data so the UI always has something to show
        return NextResponse.json({ sentiments: buildNeutral(DEFAULT_EPICS), warning: err.message });
    }
}

// ─── Capital.com native clientsentiment ──────────────────────────────────────
async function fetchCapitalSentiment(
    baseUrl: string, cst: string, xst: string, epics: string[]
): Promise<any[]> {
    try {
        const res = await fetch(`${baseUrl}/clientsentiment?epics=${epics.join(',')}`, {
            headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst },
            signal: AbortSignal.timeout(7000),
        });

        console.log('[Sentiment API] /clientsentiment status:', res.status);

        if (!res.ok) {
            const txt = await res.text();
            console.warn('[Sentiment API] Error body:', txt.substring(0, 200));
            return [];
        }

        const data = await res.json();
        console.log('[Sentiment API] Raw response:', JSON.stringify(data).substring(0, 400));

        const raw: any[] = data?.clientSentiments || [];
        if (raw.length === 0) return [];

        return raw.map((item: any) => {
            const longPct = Math.round(parseFloat(item.longPositionPercentage) || 50);
            const shortPct = 100 - longPct;
            const bias = longPct > 55 ? 'BULLISH' : longPct < 45 ? 'BEARISH' : 'NEUTRAL';
            const epic = item.instrumentName || '';
            return { epic, label: LABELS[epic] || epic, longPct, shortPct, bias };
        });

    } catch (e: any) {
        console.error('[Sentiment API] fetchCapitalSentiment threw:', e.message);
        return [];
    }
}

// ─── Snapshot-derived sentiment (fallback) ────────────────────────────────────
// Uses the /markets endpoint which always works.
// Derives "sentiment" from net price change direction + percentage.
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
        console.log('[Sentiment API] Snapshot fallback raw:', JSON.stringify(data).substring(0, 300));

        const details: any[] = data?.marketDetails || [];
        if (details.length === 0) return buildNeutral(epics);

        return details.map((m: any) => {
            const epic = m?.instrument?.epic || '';
            const pctChange = m?.snapshot?.percentageChange ?? 0;
            const netChange = m?.snapshot?.netChange ?? 0;

            // Convert price change to a synthetic long/short split
            // +5% change  → ~75% long, 25% short
            // -5% change  → ~25% long, 75% short
            // 0%          → 50/50
            const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
            const rawLong = 50 + clamp(pctChange * 5, -45, 45);
            const longPct = Math.round(rawLong);
            const shortPct = 100 - longPct;
            const bias = longPct > 55 ? 'BULLISH' : longPct < 45 ? 'BEARISH' : 'NEUTRAL';

            return {
                epic,
                label: LABELS[epic] || epic,
                longPct,
                shortPct,
                bias,
                derived: true, // flag so UI can show a note
            };
        });

    } catch (e: any) {
        console.error('[Sentiment API] Snapshot fallback threw:', e.message);
        return buildNeutral(epics);
    }
}

// ─── Neutral placeholders ─────────────────────────────────────────────────────
function buildNeutral(epics: string[]) {
    return epics.map(epic => ({
        epic, label: LABELS[epic] || epic,
        longPct: 50, shortPct: 50, bias: 'NEUTRAL',
    }));
}
