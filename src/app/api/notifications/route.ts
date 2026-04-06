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

// Fetch all notifications for the user
export async function GET() {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { data: items, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        const unreadCount = (items || []).filter(i => !i.read).length;
        return NextResponse.json({ notifications: items || [], unreadCount });
        
    } catch (error: any) {
        console.error('Notifications GET Error:', error.message);
        return NextResponse.json({ message: 'Notification Bridge Offline' }, { status: 500 });
    }
}

// Mark notifications as read
export async function PATCH(request: Request) {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { ids, markAll } = await request.json();

        if (markAll) {
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);
        } else if (ids && Array.isArray(ids) && ids.length > 0) {
            await supabase
                .from('notifications')
                .update({ read: true })
                .in('id', ids)
                .eq('user_id', userId);
        }

        return NextResponse.json({ message: 'Marked as read' });
    } catch (error: any) {
        console.error('Notifications PATCH Error:', error.message);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
