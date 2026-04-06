import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

        const { data: settings, error } = await supabase
            .from('engine_settings')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return NextResponse.json(settings || []);
    } catch (error: any) {
        console.error('Engines GET Error:', error.message);
        return NextResponse.json({ message: 'Automation Library Offline' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { engine_id, is_active, risk_level, parameters } = await request.json();
        if (!engine_id) return NextResponse.json({ error: 'Missing engine_id' }, { status: 400 });

        // Upsert via stable SDK
        const { data: existing } = await supabase
            .from('engine_settings')
            .select('id')
            .eq('user_id', userId)
            .eq('engine_id', engine_id)
            .single();

        if (existing) {
            await supabase
                .from('engine_settings')
                .update({
                    is_active: is_active ?? false,
                    risk_level: risk_level ?? 'moderate',
                    parameters: parameters ? JSON.stringify(parameters) : null,
                    updated_at: new Date()
                })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('engine_settings')
                .insert({
                    user_id: userId,
                    engine_id,
                    is_active: is_active ?? false,
                    risk_level: risk_level ?? 'moderate',
                    parameters: parameters ? JSON.stringify(parameters) : null,
                    created_at: new Date()
                });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Engines POST Error:', error.message);
        return NextResponse.json({ message: 'Failed to sync automation settings' }, { status: 500 });
    }
}
