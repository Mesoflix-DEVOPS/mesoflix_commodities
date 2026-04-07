import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        return NextResponse.json({
            exists: !!user,
            message: !!user ? 'User already exists' : 'User available'
        });
    } catch (error: any) {
        return NextResponse.json({ exists: false, message: 'Identity check timeout' });
    }
}
