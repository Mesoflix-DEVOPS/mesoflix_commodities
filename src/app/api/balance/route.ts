import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';
import { supabase } from '@/lib/supabase';
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

        // 1. Fetch User Settings (Institutional Accuracy - Item 4/10)
        const { data: accounts } = await supabase
            .from('capital_accounts')
            .select('*')
            .eq('user_id', userId)
            .order('is_active', { ascending: false })
            .limit(1);

        const accountConfig = accounts?.[0];
        if (!accountConfig) return NextResponse.json({ error: 'Brokerage Link Missing' }, { status: 404 });

        // 2. Fetch both sessions in parallel (Item 17 discovery)
        const [realSession, demoSession] = await Promise.all([
            getValidSession(userId, false).catch(() => null),
            getValidSession(userId, true).catch(() => null)
        ]);

        const fetchBalance = async (session: any) => {
            if (!session) return null;
            try {
                const res = await fetch(`${session.serverUrl}/accounts`, {
                    headers: { 'CST': session.cst, 'X-SECURITY-TOKEN': session.xSecurityToken },
                    signal: AbortSignal.timeout(8000),
                });
                if (!res.ok) return null;
                const data = await res.json();
                const acc = (data?.accounts || []).find((a: any) => a.accountId === session.activeAccountId) || data?.accounts?.[0];
                return extractBalance(acc);
            } catch (e) { return null; }
        };

        const [rBal, dBal] = await Promise.all([
            fetchBalance(realSession),
            fetchBalance(demoSession)
        ]);

        return NextResponse.json({
            realBalance: rBal,
            demoBalance: dBal,
            hasLive: !!rBal,
            hasDemo: !!dBal,
        });

    } catch (err: any) {
        console.error('[Balance API] Fatal Error:', err.message);
        return NextResponse.json({ error: 'Service Unavailable', message: err.message }, { status: 503 });
    }
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
