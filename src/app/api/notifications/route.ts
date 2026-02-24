import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    return payload ? payload.userId as string : null;
}

// Fetch all notifications for the user
export async function GET() {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const items = await db.select().from(notifications)
            .where(eq(notifications.user_id, userId))
            .orderBy(desc(notifications.created_at))
            .limit(50); // limit payload size to latest 50

        const unreadCount = items.filter(i => !i.read).length;

        return NextResponse.json({ notifications: items, unreadCount });
    } catch (error: any) {
        console.error('Notifications GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// Mark notifications as read
export async function PATCH(request: Request) {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { ids, markAll } = await request.json(); // ids: string[]

        if (markAll) {
            await db.update(notifications)
                .set({ read: true })
                .where(and(eq(notifications.user_id, userId), eq(notifications.read, false)));
        } else if (ids && Array.isArray(ids) && ids.length > 0) {
            // Note: In Drizzle, an `inArray` update might be better but for simple iterators:
            for (const id of ids) {
                await db.update(notifications).set({ read: true })
                    .where(and(eq(notifications.id, id), eq(notifications.user_id, userId)));
            }
        }

        return NextResponse.json({ message: 'Marked as read' });
    } catch (error: any) {
        console.error('Notifications PATCH Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
