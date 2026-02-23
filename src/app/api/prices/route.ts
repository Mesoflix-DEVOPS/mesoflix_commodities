import { NextRequest, NextResponse } from 'next/server';
import { getValidSession } from '@/lib/capital-service';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Capital.com REST endpoint for market prices (snapshots)
// GET /api/v1/markets?epics=GOLD,OIL_CRUDE,EURUSD,BTCUSD
// Returns: { marketDetails: [{ instrument, snapshot: { bid, offer, ... } }] }

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';
const DEMO_API = 'https://demo-api-capital.backend-capital.com/api/v1';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'demo';
        const isDemo = mode === 'demo';
        const API_URL = isDemo ? DEMO_API : LIVE_API;

        // Default epics using Capital.com's correct short symbol format
        const epicsParam = searchParams.get('epics');
        const epics = epicsParam ? epicsParam.split(',') : ['GOLD', 'OIL_CRUDE', 'EURUSD', 'BTCUSD'];

        const session = await getValidSession(tokenPayload.userId, isDemo);

        // Fetch market snapshots via REST (no websocket, Netlify compatible)
        const response = await fetch(`${API_URL}/markets?epics=${epics.join(',')}`, {
            headers: {
                'CST': session.cst,
                'X-SECURITY-TOKEN': session.xSecurityToken,
            },
            // Short timeout - we're in a serverless function
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('[Prices API] Capital.com error:', response.status, text);

            if (response.status === 401) {
                // Retry once with force-refresh session
                const freshSession = await getValidSession(tokenPayload.userId, isDemo, true);
                const retry = await fetch(`${API_URL}/markets?epics=${epics.join(',')}`, {
                    headers: {
                        'CST': freshSession.cst,
                        'X-SECURITY-TOKEN': freshSession.xSecurityToken,
                    },
                    signal: AbortSignal.timeout(8000),
                });
                if (!retry.ok) {
                    return NextResponse.json({ error: 'Session expired', prices: {} });
                }
                const retryData = await retry.json();
                return NextResponse.json({ prices: parseMarketDetails(retryData) });
            }

            return NextResponse.json({ error: `Capital.com error: ${response.status}`, prices: {} });
        }

        const data = await response.json();
        return NextResponse.json({ prices: parseMarketDetails(data) });

    } catch (err: any) {
        console.error('[Prices API] Error:', err.message);
        return NextResponse.json({ error: err.message, prices: {} });
    }
}

// Transforms Capital.com marketDetails array into a keyed map by epic
function parseMarketDetails(data: any): Record<string, { bid: number; offer: number; change: number; changePct: number }> {
    const result: Record<string, any> = {};
    const details = data?.marketDetails || [];
    for (const market of details) {
        const epic = market?.instrument?.epic;
        const snap = market?.snapshot;
        if (epic && snap) {
            result[epic] = {
                bid: snap.bid ?? 0,
                offer: snap.offer ?? 0,
                change: snap.netChange ?? 0,
                changePct: snap.percentageChange ?? 0,
            };
        }
    }
    return result;
}
