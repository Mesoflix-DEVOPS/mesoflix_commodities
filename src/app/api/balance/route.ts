import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// All authenticated requests go to the LIVE API endpoint regardless of account mode.
// The /accounts endpoint returns BOTH live and demo sub-accounts in one call.
const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get a session (always live mode — we don't need to switch accounts to read balances)
        // The /accounts endpoint returns ALL sub-accounts in one shot.
        const session = await getValidSession(tokenPayload.userId, false);

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
                // Force-refresh and retry once
                try {
                    const fresh = await getValidSession(tokenPayload.userId, false, true);
                    const retry = await fetch(`${LIVE_API}/accounts`, {
                        headers: { 'CST': fresh.cst, 'X-SECURITY-TOKEN': fresh.xSecurityToken },
                        signal: AbortSignal.timeout(8000),
                    });
                    if (retry.ok) {
                        const data = await retry.json();
                        return NextResponse.json(splitBalances(data));
                    }
                } catch (e: any) {
                    console.error('[Balance API] Refresh retry failed:', e.message);
                }
            }

            return NextResponse.json(
                { error: `Capital.com error ${res.status}` },
                { status: 503 }
            );
        }

        const data = await res.json();
        console.log('[Balance API] Accounts:', (data?.accounts || []).map((a: any) =>
            `${a.accountName}(${a.accountType})=$${a.balance?.balance}`
        ).join(', '));

        return NextResponse.json(splitBalances(data));

    } catch (err: any) {
        console.error('[Balance API] Fatal Error:', err.message);
        return NextResponse.json({ error: 'Service Unavailable', message: err.message }, { status: 503 });
    }
}

/**
 * Split the Capital.com accounts list into separate real and demo balance objects.
 *
 * Capital returns ALL accounts (live + demo) in one array:
 *  - CFD / "Physical" accounts → REAL/LIVE money
 *  - SPREADBET accounts OR accounts with "demo" in the name → DEMO money
 *
 * We return BOTH so the frontend can populate both panels from one request —
 * no mode switching required.
 */
function isDemoAccount(a: any): boolean {
    const name = (a.accountName || '').toLowerCase();
    const type = (a.accountType || '').toLowerCase();
    return type === 'spreadbet' || name.includes('demo');
}

function pickBalance(account: any) {
    const b = account?.balance || {};
    return {
        balance: Number(b.balance ?? 0),
        deposit: Number(b.deposit ?? 0),
        profitLoss: Number(b.profitLoss ?? 0),
        available: Number(b.available ?? b.availableToWithdraw ?? 0),
        equity: Number((b.balance ?? 0)) + Number((b.profitLoss ?? 0)),
        currency: account.currency || 'USD',
        accountId: account.accountId,
        accountName: account.accountName,
        accountType: account.accountType,
    };
}

function splitBalances(data: any) {
    const accounts: any[] = data?.accounts || [];

    const demoAccounts = accounts.filter(isDemoAccount);
    const realAccounts = accounts.filter(a => !isDemoAccount(a));

    // Prefer the preferred/first live account; fallback to first in list
    const realAcc = realAccounts.find(a => a.preferred) || realAccounts[0] || null;
    const demoAcc = demoAccounts.find(a => a.preferred) || demoAccounts[0] || null;

    return {
        realBalance: realAcc ? pickBalance(realAcc) : null,
        demoBalance: demoAcc ? pickBalance(demoAcc) : null,
        // Legacy field for compatibility — returns the preferred/first account
        ...(realAcc ? pickBalance(realAcc) : {}),
        accountCount: accounts.length,
        hasDemo: demoAccounts.length > 0,
        hasLive: realAccounts.length > 0,
    };
}
