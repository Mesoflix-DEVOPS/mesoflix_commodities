import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession, getApiUrl } from '@/lib/capital-service';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Hit the unified LIVE server once.
        const session = await getValidSession(tokenPayload.userId);
        const API_BASE = session.serverUrl;

        const res = await fetch(`${API_BASE}/accounts`, {
            headers: { 'CST': session.cst, 'X-SECURITY-TOKEN': session.xSecurityToken },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            if (res.status === 401) {
                const fresh = await getValidSession(tokenPayload.userId, false, true);
                const retry = await fetch(`${API_BASE}/accounts`, {
                    headers: { 'CST': fresh.cst, 'X-SECURITY-TOKEN': fresh.xSecurityToken },
                    signal: AbortSignal.timeout(8000),
                });
                if (retry.ok) {
                    return NextResponse.json(splitAccounts(await retry.json()));
                }
            }
            throw new Error(`Capital.com returned ${res.status}`);
        }

        return NextResponse.json(splitAccounts(await res.json()));

    } catch (err: any) {
        console.error('[Balance API] Fatal Error:', err.message);
        return NextResponse.json({ error: 'Service Unavailable', message: err.message }, { status: 503 });
    }
}

function splitAccounts(data: any) {
    const accounts = data?.accounts || [];
    if (accounts.length === 0) {
        return { realBalance: null, demoBalance: null, hasLive: false, hasDemo: false };
    }

    // 1. Primary Filter by explicit flags/names
    let demoAccs = accounts.filter((a: any) => 
        a.accountType === 'SPREADBET' || 
        (a.accountName || '').toLowerCase().includes('demo')
    );
    let realAccs = accounts.filter((a: any) => 
        a.accountType !== 'SPREADBET' && 
        !(a.accountName || '').toLowerCase().includes('demo')
    );

    // 2. Secondary Filter for CFD only accounts (Common for UK Capital.com users)
    if (demoAccs.length === 0 && realAccs.length > 1) {
        // Sort by balance: Demo accounts almost always have large fixed balances (e.g. 10k or 9k)
        // while Real accounts often have much smaller or oddly numbered balances.
        const sorted = [...realAccs].sort((a, b) => (b.balance?.balance || 0) - (a.balance?.balance || 0));
        
        // If highest balance is > 1000 and lowest is < 100, it's a very strong indicator.
        // In the user's case: 9000 vs 0.24.
        demoAccs = [sorted[0]];
        realAccs = [sorted[1] || sorted[0]];
    }

    const rAcc = realAccs[0] || accounts[0];
    const dAcc = demoAccs[0] || accounts[1] || accounts[0];

    return {
        realBalance: extractBalance(rAcc),
        demoBalance: extractBalance(dAcc),
        hasLive: !!rAcc,
        hasDemo: !!dAcc,
    };
}

function extractBalance(account: any) {
    if (!account) return null;
    const b = account.balance || {};
    return {
        balance: Number(b.balance ?? 0),
        deposit: Number(b.deposit ?? 0),
        profitLoss: Number(b.profitLoss ?? 0),
        available: Number(b.available ?? b.availableToWithdraw ?? 0),
        equity: Number(b.balance ?? 0) + Number(b.profitLoss ?? 0),
        currency: account.currency || 'USD',
        accountId: account.accountId,
        accountName: account.accountName,
        accountType: account.accountType,
    };
}
