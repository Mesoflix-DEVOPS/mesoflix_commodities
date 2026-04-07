import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidSession } from '@/lib/capital-service';
import { getMarketTickers } from '@/lib/capital';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = tokenPayload.userId;

        // Institutional Bridge: Fetch user via stable SDK
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (userError || !user) return NextResponse.json({ error: 'Identity Sync Failure' }, { status: 404 });

        const { searchParams } = new URL(request.url);
        const epicsParam = searchParams.get('epics');
        const epics = epicsParam ? epicsParam.split(',') : ['GOLD', 'OIL_CRUDE', 'BTCUSD'];
        const requestMode = searchParams.get('mode') || 'demo';
        const isDemo = requestMode === 'demo';

        try {
            const session = await getValidSession(userId, isDemo);
            const marketData = await getMarketTickers(session.cst, session.xSecurityToken, epics, isDemo, session.serverUrl);
            return NextResponse.json(marketData);

        } catch (err: any) {
            console.error('[Markets API] Institutional Lag:', err.message);
            if (err.message.includes('401') || err.message.toLowerCase().includes('session')) {
                const session = await getValidSession(userId, isDemo, true);
                const marketData = await getMarketTickers(session.cst, session.xSecurityToken, epics, isDemo, session.serverUrl);
                return NextResponse.json(marketData);
            }
            return NextResponse.json({ warning: 'Brokerage Data Delayed' });
        }

    } catch (error: any) {
        console.error('Markets API Critical Error:', error.message);
        return NextResponse.json({ error: 'Markets Bridge Offline' }, { status: 500 });
    }
}
