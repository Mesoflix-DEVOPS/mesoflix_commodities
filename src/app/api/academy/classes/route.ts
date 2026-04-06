import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    try {
        const { data: classes, error } = await supabase
            .from('learn_classes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(classes || []);
    } catch (error: any) {
        console.error('Academy Fetch Failure:', error.message);
        return NextResponse.json({ error: 'Academy Bridge Offline' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { title, description, youtube_url, category } = await req.json();

        if (!title || !description || !youtube_url) {
            return NextResponse.json({ error: 'Missing required training data' }, { status: 400 });
        }

        const { data: newClass, error } = await supabase
            .from('learn_classes')
            .insert({
                title,
                description,
                youtube_url,
                category: category || 'Beginner',
            })
            .select('*')
            .single();

        if (error) throw error;
        return NextResponse.json(newClass);
    } catch (error: any) {
        console.error('Academy Create Failure:', error.message);
        return NextResponse.json({ error: 'Academy Management Offline' }, { status: 500 });
    }
}
