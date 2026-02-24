import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Capital.com has two completely separate server environments.
// Live and Demo sessions are independent — you MUST use the correct URL for each.
const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';
const DEMO_API = 'https://demo-api-capital.backend-capital.com/api/v1';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Fetch BOTH sessions in parallel — live from live server, demo from demo server.
        // Each uses the correct URL and has its own independent session token.
        const [liveResult, demoResult] = await Promise.allSettled([
            fetchAccountBalance(tokenPayload.userId, false, LIVE_API),
            fetchAccountBalance(tokenPayload.userId, true, DEMO_API),
        ]);

        const realBalance = liveResult.status === 'fulfilled' ? liveResult.value : null;
        const demoBalance = demoResult.status === 'fulfilled' ? demoResult.value : null;

        if (liveResult.status === 'rejected') {
            console.error('[Balance API] Live fetch failed:', liveResult.reason?.message);
        }
        if (demoResult.status === 'rejected') {
            console.error('[Balance API] Demo fetch failed:', demoResult.reason?.message);
        }

        // Return both balances — frontend populates both panels from one response
        return NextResponse.json({
            realBalance,
            demoBalance,
            hasLive: realBalance !== null,
            hasDemo: demoBalance !== null,
        });

    } catch (err: any) {
        console.error('[Balance API] Fatal Error:', err.message);
        return NextResponse.json({ error: 'Service Unavailable', message: err.message }, { status: 503 });
    }
}

/**
 * Fetch the balance for one account type (live or demo) using the correct server.
 *
 * @param userId - the authenticated user
 * @param isDemo - true = use demo server, false = use live server
 * @param apiUrl - the Capital.com API base URL for this mode
 */
async function fetchAccountBalance(
    userId: string,
    isDemo: boolean,
    apiUrl: string,
): Promise<BalancePayload> {
    // Get (or create) a session on the correct server
    const session = await getValidSession(userId, isDemo);

    const res = await fetch(`${apiUrl}/accounts`, {
        headers: {
            'CST': session.cst,
            'X-SECURITY-TOKEN': session.xSecurityToken,
        },
        signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
        // Try force-refreshing once on 401
        if (res.status === 401) {
            const fresh = await getValidSession(userId, isDemo, true);
            const retry = await fetch(`${apiUrl}/accounts`, {
                headers: { 'CST': fresh.cst, 'X-SECURITY-TOKEN': fresh.xSecurityToken },
                signal: AbortSignal.timeout(8000),
            });
            if (retry.ok) {
                const data = await retry.json();
                return pickPreferredAccount(data, isDemo);
            }
            const errBody = await retry.text();
            throw new Error(`Capital.com ${isDemo ? 'DEMO' : 'LIVE'} retry failed: ${retry.status} ${errBody.substring(0, 100)}`);
        }
        const errBody = await res.text();
        throw new Error(`Capital.com ${isDemo ? 'DEMO' : 'LIVE'}: ${res.status} ${errBody.substring(0, 100)}`);
    }

    const data = await res.json();
    console.log(
        `[Balance API] ${isDemo ? 'DEMO' : 'LIVE'} accounts:`,
        (data?.accounts || []).map((a: any) => `${a.accountName}(${a.accountType})=${a.currency}${a.balance?.balance ?? 0}`).join(', ')
    );
    return pickPreferredAccount(data, isDemo);
}

interface BalancePayload {
    balance: number;
    deposit: number;
    profitLoss: number;
    available: number;
    equity: number;
    currency: string;
    accountId: string;
    accountName: string;
    accountType: string;
}

/**
 * Pick the preferred account from a GET /accounts response and extract balance fields.
 * On the live server: returns the preferred live CFD account.
 * On the demo server: returns the preferred demo account.
 */
function pickPreferredAccount(data: any, _isDemo: boolean): BalancePayload {
    const accounts: any[] = data?.accounts || [];
    if (accounts.length === 0) throw new Error('No accounts returned');

    // Prefer account marked as preferred; fallback to first
    const account = accounts.find(a => a.preferred) || accounts[0];
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
