import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { clearCachedSession } from '@/lib/capital-service';

import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { accountId, accountType } = await req.json();
        if (!accountId) return NextResponse.json({ error: 'Account ID required' }, { status: 400 });

        const userId = tokenPayload.userId;
        const isDemo = accountType === 'SPREADBET' || (accountId && accountId.toLowerCase().includes('demo'));

        // Institutional Bridge: Update selection via stable SDK
        const updateField = isDemo ? 'selected_demo_account_id' : 'selected_real_account_id';
        
        await supabase
            .from('capital_accounts')
            .update({
                [updateField]: accountId,
                selected_capital_account_id: accountId, // Keep legacy in sync
                updated_at: new Date()
            })
            .eq('user_id', userId)
            .eq('is_active', true);

        // Invalidate session cache to ensure the next request picks up the fresh account preference
        await clearCachedSession(userId);

        return NextResponse.json({ success: true, accountId });

    } catch (err: any) {
        console.error('[Select Account API] Error:', err.message);
        return NextResponse.json({ error: 'Failed to switch institutional account' }, { status: 500 });
    }
}
