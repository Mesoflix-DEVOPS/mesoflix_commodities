import { NextRequest, NextResponse } from 'next/server';
import { getValidSession } from '@/lib/capital-service';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { appendFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';
const DEMO_API = 'https://demo-api-capital.backend-capital.com/api/v1';

const LOG_FILE = join(process.cwd(), 'api-debug.log');
function log(msg: string) {
    const timestamp = new Date().toISOString();
    try {
        appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
    } catch { /* ignore log errors */ }
}

export async function GET(req: NextRequest) {
    log(`GET /api/prices?${new URL(req.url).searchParams.toString()}`);
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
        log(`Session acquired. accountIsDemo=${session.accountIsDemo}, cst=${session.cst.substring(0, 5)}...`);

        const apiIsDemo = session.accountIsDemo ?? isDemo;
        const API_URL = apiIsDemo ? DEMO_API : LIVE_API;

        log(`Fetching from ${API_URL}/markets?epics=${epics.join(',')}`);
        const response = await fetch(`${API_URL}/markets?epics=${epics.join(',')}`, {
            headers: {
                'CST': session.cst,
                'X-SECURITY-TOKEN': session.xSecurityToken,
            },
            signal: AbortSignal.timeout(8000),
        });

        log(`Response status: ${response.status}`);

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

        log(`Parsing JSON...`);
        const data = await response.json();
        log(`Data acquired. marketDetails length=${data?.marketDetails?.length}`);

        const parsed = parseMarketDetails(data);
        log(`Parsing complete. Returning JSON...`);
        return NextResponse.json({ prices: parsed });

    } catch (err: any) {
        log(`FATAL ERROR: ${err.message}`);
        log(`STACK: ${err.stack}`);
        console.error('[Prices API] Fatal Error:', err);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            prices: {}
        }, { status: 500 });
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
