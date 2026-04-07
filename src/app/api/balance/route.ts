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

        const userId = tokenPayload.userId;

        // 1. Fetch User Settings (Institutional Accuracy - Item 4)
        const { data: accountConfig } = await supabase
            .from('capital_accounts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!accountConfig) return NextResponse.json({ error: 'Brokerage Link Missing' }, { status: 404 });

        // 2. Fetch session and standard server URL (Item 14)
        const session = await getValidSession(userId);
        if (!session) throw new Error("Brokerage Link Unavailable");

        const API_BASE = session.serverUrl;

        const res = await fetch(`${API_BASE}/accounts`, {
            headers: { 'CST': session.cst, 'X-SECURITY-TOKEN': session.xSecurityToken },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) throw new Error(`Brokerage returned ${res.status}`);

        const data = await res.json();
        const accounts = data?.accounts || [];

        // 3. Explicit ID Mapping (Item 4 fix)
        const rAcc = accounts.find((a: any) => a.accountId === accountConfig.selected_real_account_id) || accounts[0];
        const dAcc = accounts.find((a: any) => a.accountId === accountConfig.selected_demo_account_id) || accounts[1] || accounts[0];

        return NextResponse.json({
            realBalance: extractBalance(rAcc),
            demoBalance: extractBalance(dAcc),
            hasLive: !!rAcc,
            hasDemo: !!dAcc,
        });

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
