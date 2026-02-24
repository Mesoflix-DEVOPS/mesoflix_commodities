import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Capital.com uses the LIVE endpoint for all authenticated requests,
// including when the active sub-account is a Demo account.
const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const mode = new URL(req.url).searchParams.get('mode') || 'real';
        const isDemo = mode === 'demo';

        // Get session (handles demo/live switch internally via PUT /session)
        const session = await getValidSession(tokenPayload.userId, isDemo);
        console.log(`[Balance API] mode=${mode}, accountIsDemo=${session.accountIsDemo}, activeId=${session.activeAccountId}`);

        // All authenticated calls use the LIVE endpoint URL regardless of mode.
        // The active sub-account is already switched by getValidSession.
        const res = await fetch(`${LIVE_API}/accounts`, {
            headers: {
                'CST': session.cst,
                'X-SECURITY-TOKEN': session.xSecurityToken,
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error('[Balance API] Capital.com accounts error:', res.status, txt);

            if (res.status === 401) {
                // Session is truly stale — force-refresh once
                try {
                    const fresh = await getValidSession(tokenPayload.userId, isDemo, true);
                    const retry = await fetch(`${LIVE_API}/accounts`, {
                        headers: { 'CST': fresh.cst, 'X-SECURITY-TOKEN': fresh.xSecurityToken },
                        signal: AbortSignal.timeout(8000),
                    });
                    if (retry.ok) {
                        const data = await retry.json();
                        return NextResponse.json(pickBalance(data, isDemo, fresh.activeAccountId));
                    }
                } catch (refreshErr: any) {
                    console.error('[Balance API] Force-refresh failed:', refreshErr.message);
                }
            }

            // Capital.com unavailable — return 503, NOT 200 with zeros.
            // The frontend must NOT replace the displayed balance with zeros on 503.
            return NextResponse.json(
                { error: `Capital.com error ${res.status}`, capitalStatus: res.status },
                { status: 503 }
            );
        }

        const data = await res.json();
        console.log('[Balance API] Raw accounts count:', data?.accounts?.length);
        return NextResponse.json(pickBalance(data, isDemo, session.activeAccountId));

    } catch (err: any) {
        console.error('[Balance API] Fatal Error:', err.message);
        // 503 — Capital.com unavailable, NOT a 200 with zeros.
        return NextResponse.json(
            { error: 'Service Unavailable', message: err.message },
            { status: 503 }
        );
    }
}

/**
 * Pick the correct account from the Capital.com /accounts response.
 *
 * Capital.com returns ALL accounts (live + demo) in a single array.
 * Demo accounts are typically accountType "SPREADBET" or have "Demo" in their name.
 * Live accounts are typically accountType "CFD" or "PHYSICAL".
 *
 * We prefer to match by activeAccountId (what the service switched to).
 * If that fails we fall back to type-based matching.
 */
function isDemoAccount(account: any): boolean {
    const name = (account.accountName || '').toLowerCase();
    const type = (account.accountType || '').toLowerCase();
    return type === 'spreadbet' || name.includes('demo');
}

function pickBalance(
    data: any,
    isDemo: boolean,
    activeAccountId?: string | null
) {
    const accounts: any[] = data?.accounts || [];
    if (accounts.length === 0) {
        return {
            balance: 0, deposit: 0, profitLoss: 0,
            available: 0, equity: 0, currency: 'USD',
            accountCount: 0,
        };
    }

    // 1st priority: match by the accountId that was switched to
    let account = activeAccountId
        ? accounts.find(a => a.accountId === activeAccountId)
        : null;

    // 2nd priority: match by account type (demo vs live)
    if (!account) {
        account = isDemo
            ? accounts.find(isDemoAccount)
            : accounts.find(a => !isDemoAccount(a) && a.preferred) || accounts.find(a => !isDemoAccount(a));
    }

    // Fallback: first account
    if (!account) account = accounts[0];

    const b = account.balance || {};

    return {
        balance: b.balance ?? 0,
        deposit: b.deposit ?? 0,
        profitLoss: b.profitLoss ?? 0,
        available: b.available ?? b.availableToWithdraw ?? 0,
        equity: (b.balance ?? 0) + (b.profitLoss ?? 0),
        currency: account.currency || 'USD',
        accountId: account.accountId,
        accountName: account.accountName,
        accountType: account.accountType,
        accountCount: accounts.length,
    };
}
