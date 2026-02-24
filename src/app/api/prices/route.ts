import { NextRequest, NextResponse } from 'next/server';
import { getValidSession } from '@/lib/capital-service';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Capital.com market prices endpoint.
// All authenticated calls use the LIVE endpoint URL.
// The active sub-account (demo vs live) is managed by getValidSession via PUT /session.
const API_BASE = 'https://api-capital.backend-capital.com/api/v1';

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
        const mode = searchParams.get('mode') || 'real';
        const isDemo = mode === 'demo';

        const epicsParam = searchParams.get('epics');
        const epics = epicsParam ? epicsParam.split(',') : ['GOLD', 'OIL_CRUDE', 'EURUSD', 'BTCUSD'];

        const session = await getValidSession(tokenPayload.userId, isDemo);

        const response = await fetch(`${API_BASE}/markets?epics=${epics.join(',')}`, {
            headers: {
                'CST': session.cst,
                'X-SECURITY-TOKEN': session.xSecurityToken,
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('[Prices API] Capital.com error:', response.status, text);

            if (response.status === 401) {
                // Force-refresh and retry once
                try {
                    const freshSession = await getValidSession(tokenPayload.userId, isDemo, true);
                    const retry = await fetch(`${API_BASE}/markets?epics=${epics.join(',')}`, {
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
                } catch (refreshErr: any) {
                    console.error('[Prices API] Refresh retry failed:', refreshErr.message);
                }
            }

            // Return empty prices with a warning (not a 500 — the UI can handle this gracefully)
            return NextResponse.json({
                prices: {},
                warning: `Capital.com returned ${response.status}`,
            });
        }

        const data = await response.json();
        return NextResponse.json({ prices: parseMarketDetails(data) });

    } catch (err: any) {
        console.error('[Prices API] Fatal Error:', err.message);
        return NextResponse.json({
            prices: {},
            error: 'Internal Server Error',
            message: err.message,
        }, { status: 500 });
    }
}

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
