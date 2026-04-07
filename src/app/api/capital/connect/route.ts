import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/crypto';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { clearCachedSession } from '@/lib/capital-service';

import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    return payload ? (payload.userId as string) : null;
}

export async function GET() {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { data: accounts, error } = await supabase
            .from('capital_accounts')
            .select('id, label, is_active, account_type, created_at')
            .eq('user_id', userId);

        if (error) throw error;
        return NextResponse.json({ accounts: accounts || [] });
    } catch (error: any) {
        console.error('Capital GET Error:', error.message);
        return NextResponse.json({ message: 'Institutional Connection Library Offline' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { label, login, password, apiKey, accountType = 'live' } = await request.json();
        if (!label || !password || !apiKey) {
            return NextResponse.json({ message: 'Label, Password, and API Key are required' }, { status: 400 });
        }

        const encryptedKey = encrypt(apiKey);
        const encryptedPass = encrypt(password);

        const { data: existing } = await supabase.from('capital_accounts').select('id').eq('user_id', userId);
        const isActive = (existing || []).length === 0;

        const { error: insError } = await supabase.from('capital_accounts').insert({
            user_id: userId,
            label,
            is_active: isActive,
            encrypted_api_key: encryptedKey,
            encrypted_api_password: encryptedPass,
            account_type: accountType,
            capital_account_id: login || '',
            created_at: new Date()
        });

        if (insError) throw insError;

        await supabase.from('notifications').insert({
            user_id: userId,
            title: 'New API Token Added',
            message: `The Capital.com token "${label}" was successfully added to your vault.`,
            type: 'success'
        });

        return NextResponse.json({ message: 'Capital.com token saved successfully' });
    } catch (error: any) {
        console.error('Capital POST Error:', error.message);
        return NextResponse.json({ message: 'Failed to save institutional credentials' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { accountId, action } = await request.json(); 
        if (!accountId || (action !== 'connect' && action !== 'disconnect')) {
            return NextResponse.json({ message: 'Invalid request parameters' }, { status: 400 });
        }

        if (action === 'connect') {
            await supabase.from('capital_accounts').update({ is_active: false }).eq('user_id', userId);
            await supabase.from('capital_accounts').update({ is_active: true, updated_at: new Date() }).eq('id', accountId);
            await clearCachedSession(userId);
            
            await supabase.from('notifications').insert({
                user_id: userId,
                title: 'Trading Bridge Connected',
                message: `Your global trading stream is now active.`,
                type: 'info'
            });
        } else {
            await supabase.from('capital_accounts').update({ is_active: false, updated_at: new Date() }).eq('id', accountId);
            await clearCachedSession(userId);
        }

        return NextResponse.json({ message: `Token ${action}ed successfully` });
    } catch (error: any) {
        console.error('Capital PATCH Error:', error.message);
        return NextResponse.json({ message: 'Failed to update institutional link' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('id');
        if (!accountId) return NextResponse.json({ message: 'ID required' }, { status: 400 });

        const { error } = await supabase.from('capital_accounts').delete().eq('id', accountId).eq('user_id', userId);
        if (error) throw error;

        return NextResponse.json({ message: 'Token deleted' });
    } catch (error: any) {
        console.error('Capital DELETE Error:', error.message);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
