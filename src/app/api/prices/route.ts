import { NextRequest, NextResponse } from 'next/server';
import { getValidSession, getApiUrl } from '@/lib/capital-service';
import { db, withRetry } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const epicsParam = searchParams.get('epics');
        const epics = epicsParam ? epicsParam.split(',') : ['GOLD', 'OIL_CRUDE', 'EURUSD', 'BTCUSD'];

        // Get unified session
        const session = await withRetry(() => getValidSession(tokenPayload.userId));
        const API_BASE = getApiUrl(false);

        const response = await fetch(`${API_BASE}/markets?epics=${epics.join(',')}`, {
            headers: {
                'CST': session.cst,
                'X-SECURITY-TOKEN': session.xSecurityToken,
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[Prices API] Capital.com error:`, response.status, text);

            if (response.status === 401) {
                try {
                    const freshSession = await getValidSession(tokenPayload.userId, false, true);
                    const retry = await fetch(`${API_BASE}/markets?epics=${epics.join(',')}`, {
                        headers: { 'CST': freshSession.cst, 'X-SECURITY-TOKEN': freshSession.xSecurityToken },
                        signal: AbortSignal.timeout(8000),
                    });
                    if (retry.ok) {
                        return NextResponse.json({ prices: parseMarketDetails(await retry.json()) });
                    }
                } catch (refreshErr: any) {
                    console.error('[Prices API] Refresh retry failed:', refreshErr.message);
                }
            }

            return NextResponse.json({ prices: {}, warning: `Capital.com returned ${response.status}` });
        }

        return NextResponse.json({ prices: parseMarketDetails(await response.json()) });

    } catch (err: any) {
        console.error('[Prices API] Fatal Error:', err.message);
        return NextResponse.json({ prices: {}, error: 'Internal Server Error', message: err.message }, { status: 500 });
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
