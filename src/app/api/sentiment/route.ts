import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';
const DEMO_API = 'https://demo-api-capital.backend-capital.com/api/v1';

const DEFAULT_EPICS = ['GOLD', 'OIL_CRUDE', 'EURUSD', 'BTCUSD', 'NATGAS', 'SILVER'];

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
        const apiIsDemo = session.accountIsDemo ?? isDemo;
        const API_URL = apiIsDemo ? DEMO_API : LIVE_API;

        const epicsParam = searchParams.get('epics');
        const epics = epicsParam ? epicsParam.split(',') : DEFAULT_EPICS;

        // Capital.com client sentiment endpoint
        // Returns: { clientSentiments: [{ instrumentName, longPositionPercentage, shortPositionPercentage }] }
        const res = await fetch(`${API_URL}/clientsentiment?epics=${epics.join(',')}`, {
            headers: {
                'CST': session.cst,
                'X-SECURITY-TOKEN': session.xSecurityToken,
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error('[Sentiment API] Capital.com error:', res.status, txt);

            // If 401, force-refresh session and retry once
            if (res.status === 401) {
                try {
                    const fresh = await getValidSession(tokenPayload.userId, isDemo, true);
                    const apiIsDemo2 = fresh.accountIsDemo ?? isDemo;
                    const API_URL2 = apiIsDemo2 ? DEMO_API : LIVE_API;
                    const retry = await fetch(`${API_URL2}/clientsentiment?epics=${epics.join(',')}`, {
                        headers: { 'CST': fresh.cst, 'X-SECURITY-TOKEN': fresh.xSecurityToken },
                        signal: AbortSignal.timeout(8000),
                    });
                    if (retry.ok) {
                        const data = await retry.json();
                        return NextResponse.json(parseSentiments(data, epics));
                    }
                } catch { /* fall through */ }
            }

            return NextResponse.json({ sentiments: [], warning: `Capital.com ${res.status}` });
        }

        const data = await res.json();
        return NextResponse.json(parseSentiments(data, epics));

    } catch (err: any) {
        console.error('[Sentiment API] Error:', err.message);
        return NextResponse.json({ sentiments: [], warning: err.message });
    }
}

// ── Friendly labels map ──────────────────────────────────────────────────────
const LABELS: Record<string, string> = {
    GOLD: 'Gold',
    OIL_CRUDE: 'Crude Oil',
    EURUSD: 'EUR/USD',
    BTCUSD: 'BTC/USD',
    NATGAS: 'Natural Gas',
    SILVER: 'Silver',
};

function parseSentiments(data: any, requestedEpics: string[]) {
    const raw: any[] = data?.clientSentiments || [];

    // Map to a clean structure
    const sentiments = raw.map((item: any) => {
        const epic = item.instrumentName || '';
        const longPct = parseFloat(item.longPositionPercentage) || 0;
        const shortPct = parseFloat(item.shortPositionPercentage) || (100 - longPct);
        const bias = longPct > 50 ? 'BULLISH' : longPct < 50 ? 'BEARISH' : 'NEUTRAL';

        return {
            epic,
            label: LABELS[epic] || epic,
            longPct: Math.round(longPct),
            shortPct: Math.round(shortPct),
            bias,
        };
    });

    // If Capital.com returned fewer than requested, fill in with neutral placeholders
    const returned = new Set(sentiments.map((s: any) => s.epic));
    requestedEpics.forEach(epic => {
        if (!returned.has(epic)) {
            sentiments.push({
                epic,
                label: LABELS[epic] || epic,
                longPct: 50,
                shortPct: 50,
                bias: 'NEUTRAL',
            });
        }
    });

    return { sentiments };
}
