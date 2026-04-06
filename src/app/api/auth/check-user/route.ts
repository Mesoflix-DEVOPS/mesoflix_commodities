import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
