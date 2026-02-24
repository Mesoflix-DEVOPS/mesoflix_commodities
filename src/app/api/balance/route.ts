import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';
const DEMO_API = 'https://demo-api-capital.backend-capital.com/api/v1';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const mode = new URL(req.url).searchParams.get('mode') || 'real';
        const isDemo = mode === 'demo';

        // Get session — accountIsDemo tells us which Capital.com server to use
        const session = await getValidSession(tokenPayload.userId, isDemo);
        const apiIsDemo = session.accountIsDemo ?? false; // default live if old cache
        const selectedAccountId = session.selectedAccountId; // pass from service if stored in credAccount
        const API_URL = apiIsDemo ? DEMO_API : LIVE_API;

        console.log(`[Balance API] mode=${mode}, accountIsDemo=${apiIsDemo}, endpoint=${API_URL.includes('demo') ? 'DEMO' : 'LIVE'}`);

        // Fetch accounts list
        const res = await fetch(`${API_URL}/accounts`, {
            headers: {
                'CST': session.cst,
                'X-SECURITY-TOKEN': session.xSecurityToken,
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error('[Balance API] Capital.com accounts error:', res.status, txt);

            // Session may be stale — force-refresh once
            if (res.status === 401) {
                try {
                    const fresh = await getValidSession(tokenPayload.userId, isDemo, true);
                    const apiIsDemo2 = fresh.accountIsDemo ?? false;
                    const API_URL2 = apiIsDemo2 ? DEMO_API : LIVE_API;
                    const retry = await fetch(`${API_URL2}/accounts`, {
                        headers: { 'CST': fresh.cst, 'X-SECURITY-TOKEN': fresh.xSecurityToken },
                        signal: AbortSignal.timeout(8000),
                    });
                    if (retry.ok) {
                        const data = await retry.json();
                        return NextResponse.json(pickBalance(data, isDemo, fresh.selectedAccountId));
                    }
                } catch (e) { /* fall through */ }
            }
            // Return zeros rather than an error so the UI doesn't break
            return NextResponse.json({ balance: 0, deposit: 0, profitLoss: 0, available: 0, equity: 0, currency: 'USD', warning: `Capital.com error ${res.status}` });
        }

        const data = await res.json();
        console.log('[Balance API] Raw accounts:', JSON.stringify(data).substring(0, 400));
        return NextResponse.json(pickBalance(data, isDemo, session.selectedAccountId));

    } catch (err: any) {
        console.error('[Balance API] Error:', err.message);
        return NextResponse.json({ balance: 0, deposit: 0, profitLoss: 0, available: 0, equity: 0, currency: 'USD', warning: err.message });
    }
}

/**
 * Pick the preferred (or first) account and extract balance fields.
 * Capital.com accountType is always 'CFD' — the preferred account is the active one.
 */
function pickBalance(data: any, isDemo: boolean, selectedAccountId?: string | null) {
    let accounts: any[] = data?.accounts || [];
    if (accounts.length === 0) {
        return { balance: 0, deposit: 0, profitLoss: 0, available: 0, equity: 0, currency: 'USD' };
    }

    // Filter accounts strictly based on requested mode (Real vs Demo)
    if (isDemo) {
        accounts = accounts.filter(a =>
            a.accountType?.toUpperCase() === 'DEMO' ||
            a.accountName?.toLowerCase().includes('demo')
        );
    } else {
        accounts = accounts.filter(a =>
            a.accountType?.toUpperCase() !== 'DEMO' &&
            !a.accountName?.toLowerCase().includes('demo')
        );
    }

    // Target the first matching account
    let accToUse = accounts[0] || null;

    if (!accToUse) return { balance: 0, deposit: 0, profitLoss: 0, available: 0, equity: 0, currency: 'USD' };

    const b = accToUse.balance || {};

    return {
        balance: b.balance ?? 0,
        deposit: b.deposit ?? 0,
        profitLoss: b.profitLoss ?? 0,
        available: b.available ?? 0,
        equity: (b.balance ?? 0) + (b.profitLoss ?? 0),
        currency: accToUse.currency || 'USD',
    };
}
