import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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
        const { title, description, youtube_url, category, thumbnail_url } = await req.json();

        if (!title || !description || !youtube_url) {
            return NextResponse.json({ error: 'Missing required training data' }, { status: 400 });
        }

        const { data: newClass, error } = await supabase
            .from('learn_classes')
            .insert({
                title,
                description,
                youtube_url,
                thumbnail_url,
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

export async function PUT(req: NextRequest) {
    try {
        const { id, title, description, youtube_url, category, thumbnail_url } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Missing class ID' }, { status: 400 });
        }

        const { data: updatedClass, error } = await supabase
            .from('learn_classes')
            .update({
                title,
                description,
                youtube_url,
                thumbnail_url,
                category,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        return NextResponse.json(updatedClass);
    } catch (error: any) {
        console.error('Academy Update Failure:', error.message);
        return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing class ID' }, { status: 400 });
        }

        const { error } = await supabase
            .from('learn_classes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Academy Delete Failure:', error.message);
        return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
    }
}
