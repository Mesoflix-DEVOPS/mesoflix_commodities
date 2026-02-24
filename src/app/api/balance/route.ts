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
        const API_BASE = getApiUrl(false);
        const session = await getValidSession(tokenPayload.userId);

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

    // Try explicit names or types first
    let demoAccs = accounts.filter((a: any) => a.accountType === 'SPREADBET' || (a.accountName || '').toLowerCase().includes('demo'));
    let realAccs = accounts.filter((a: any) => a.accountType !== 'SPREADBET' && !(a.accountName || '').toLowerCase().includes('demo'));

    // Fallback heuristic for unified CFD accounts (where Demo and Live look identical)
    if (demoAccs.length === 0 && realAccs.length > 1) {
        // Based on user configuration: GBP account is Demo, USD is Live.
        const gbpAcc = realAccs.find((a: any) => a.currency === 'GBP');
        const usdAcc = realAccs.find((a: any) => a.currency === 'USD');

        if (gbpAcc && usdAcc) {
            demoAccs = [gbpAcc];
            realAccs = [usdAcc];
        } else {
            // Ultimate fallback: assign preferred to demo for testing
            demoAccs = [realAccs.find((a: any) => a.preferred) || realAccs[1]];
            realAccs = [realAccs.find((a: any) => !a.preferred) || realAccs[0]];
        }
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
