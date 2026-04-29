import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Failsafe Role Sync
        const result = await db.execute(sql`SELECT role FROM users WHERE id = ${session.user.id} LIMIT 1`);
        const user = result.rows[0] as any;

        return NextResponse.json({
            user: {
                id: session.user.id,
                email: session.user.email,
                role: user?.role || session.user.role,
                name: session.user.name
            }
        });
    } catch (error) {
        console.error('Auth/Me API Failure:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
