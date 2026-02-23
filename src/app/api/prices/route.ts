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

        // Default epics using Capital.com's correct short symbol format
        const epicsParam = searchParams.get('epics');
        const epics = epicsParam ? epicsParam.split(',') : ['GOLD', 'OIL_CRUDE', 'EURUSD', 'BTCUSD'];

        const session = await getValidSession(tokenPayload.userId, isDemo);
        // CRITICAL: use the account's actual endpoint — live keys must go to live endpoint.
        // Even if user clicked 'demo' mode, the master account in our DB is 'live'.
        const apiIsDemo = session.accountIsDemo ?? isDemo;
        const API_URL = apiIsDemo ? DEMO_API : LIVE_API;

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

            // Capital.com session may be stale — try a force-refresh once
            if (response.status === 401) {
                try {
                    const freshSession = await getValidSession(tokenPayload.userId, isDemo, true);
                    const retry = await fetch(`${API_URL}/markets?epics=${epics.join(',')}`, {
                        headers: {
                            'CST': freshSession.cst,
                            'X-SECURITY-TOKEN': freshSession.xSecurityToken,
                        },
                        signal: AbortSignal.timeout(8000),
                    });
                    if (retry.ok) {
                        const retryData = await retry.json();
                        return NextResponse.json({ prices: parseMarketDetails(retryData) });
                    }
                    // Retry failed — return safe empty payload, NOT 401
                    return NextResponse.json({ prices: {}, warning: 'Capital.com session could not be refreshed' });
                } catch (refreshErr: any) {
                    return NextResponse.json({ prices: {}, warning: refreshErr.message });
                }
            }

            // Other non-200 from Capital.com
            return NextResponse.json({ prices: {}, warning: `Capital.com returned ${response.status}` });
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
