import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ epic: string }> }
) {
    try {
        const { epic } = await params;
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'real';
        const resolution = searchParams.get('resolution') || 'HOUR';
        const max = searchParams.get('max') || '50';

        const session = await getValidSession(tokenPayload.userId, mode === 'demo');
        const API_URL = session.serverUrl;

        // Capital.com price history: GET /prices/{epic}?resolution=HOUR&max=50
        const priceRes = await fetch(
            `${API_URL}/prices/${encodeURIComponent(epic)}?resolution=${resolution}&max=${max}`,
            {
                headers: { 'CST': session.cst, 'X-SECURITY-TOKEN': session.xSecurityToken },
                signal: AbortSignal.timeout(8000),
            }
        );

        // Also fetch snapshot for current stats
        const snapRes = await fetch(
            `${API_URL}/markets?epics=${encodeURIComponent(epic)}`,
            {
                headers: { 'CST': session.cst, 'X-SECURITY-TOKEN': session.xSecurityToken },
                signal: AbortSignal.timeout(8000),
            }
        );

        let chartData: any[] = [];
        let snapshot: any = null;

        if (priceRes.ok) {
            const pd = await priceRes.json();
            // Capital.com returns: { prices: [{ snapshotTime, openPrice:{bid,ask}, highPrice:{bid,ask}, lowPrice:{bid,ask}, closePrice:{bid,ask} }] }
            chartData = (pd.prices || []).map((p: any) => ({
                time: p.snapshotTime
                    ? new Date(p.snapshotTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '',
                open: p.openPrice?.bid ?? 0,
                high: p.highPrice?.bid ?? 0,
                low: p.lowPrice?.bid ?? 0,
                close: p.closePrice?.bid ?? 0,
            }));
        } else {
            console.error('[Chart API] Price history error:', priceRes.status);
        }

        if (snapRes.ok) {
            const sd = await snapRes.json();
            const mkt = (sd.marketDetails || [])[0];
            if (mkt) {
                snapshot = {
                    bid: mkt.snapshot?.bid ?? 0,
                    offer: mkt.snapshot?.offer ?? 0,
                    high: mkt.snapshot?.high ?? 0,
                    low: mkt.snapshot?.low ?? 0,
                    netChange: mkt.snapshot?.netChange ?? 0,
                    percentageChange: mkt.snapshot?.percentageChange ?? 0,
                    updateTime: mkt.snapshot?.updateTime ?? '',
                    status: mkt.snapshot?.marketStatus ?? 'UNKNOWN',
                    scalingFactor: mkt.instrument?.valueOfOnePip ?? 1,
                    currency: mkt.instrument?.currencies?.[0]?.name ?? 'USD',
                };
            }
        }

        return NextResponse.json({ epic, chartData, snapshot });

    } catch (err: any) {
        console.error('[Chart API] Error:', err.message);
        return NextResponse.json({ epic: '', chartData: [], snapshot: null, warning: err.message });
    }
}
