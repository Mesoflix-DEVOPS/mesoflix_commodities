import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getValidSession } from '@/lib/capital-service';
import { getAccounts, getPositions, getHistory } from '@/lib/capital';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ message: 'Unauthorized: Session Invalid' }, { status: 401 });

        const userId = tokenPayload.userId;

        // Institutional Bridge: Fetch user via stable SDK
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ message: 'Identity Sync Failure' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const modeInput = searchParams.get('mode') || 'demo';
        const isDemo = modeInput === 'demo';

        const userData = { fullName: user.full_name || 'Trader' };

        try {
            const session = await getValidSession(userId, isDemo);

            const [accountsData, positionsData, historyData] = await Promise.all([
                getAccounts(session.cst, session.xSecurityToken, isDemo, session.serverUrl),
                getPositions(session.cst, session.xSecurityToken, isDemo, session.serverUrl),
                getHistory(session.cst, session.xSecurityToken, isDemo, { max: 50 }, session.serverUrl)
            ]);

            const accounts = (accountsData.accounts || []).map((a: any) => ({
                ...a,
                balance: {
                    ...(a.balance || {}),
                    availableToWithdraw: a.balance?.available ?? a.balance?.availableToWithdraw ?? 0,
                    equity: (a.balance?.balance ?? 0) + (a.balance?.profitLoss ?? 0),
                }
            }));

            return NextResponse.json({
                ...accountsData,
                accounts,
                positions: positionsData?.positions || [],
                history: historyData?.activities || [],
                user: userData
            });

        } catch (err: any) {
            console.error('[Dashboard API] Institutional Lag:', err.message);
            return NextResponse.json({
                accounts: [], positions: [], history: [],
                warning: 'Brokerage Connection Lagging',
                user: userData
            });
        }

    } catch (error: any) {
        console.error('[Dashboard API] Fatal Error:', error.message);
        return NextResponse.json({ message: 'Dashboard Bridge Offline' }, { status: 500 });
    }
}
