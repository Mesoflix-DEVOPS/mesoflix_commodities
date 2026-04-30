import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all potential partners (No exclusions, as requested)
        const result = await pool.query('SELECT id, email, full_name, role FROM users ORDER BY created_at DESC');
        return NextResponse.json({ users: result.rows });
    } catch (error: any) {
        console.error('Failed to fetch institutional user directory:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
