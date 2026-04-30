import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Fetch detailed performance for this specific campaign, broken down by staff
        const query = `
            SELECT 
                u.id as staff_id,
                u.full_name as staff_name,
                u.email as staff_email,
                ca.unique_code,
                (SELECT COUNT(*) FROM campaign_analytics can 
                 WHERE can.assignment_id = ca.id AND can.event_type = 'CLICK') as clicks,
                (SELECT COUNT(*) FROM campaign_analytics can 
                 WHERE can.assignment_id = ca.id AND can.event_type = 'LEAD') as leads
            FROM campaign_assignments ca
            INNER JOIN users u ON ca.staff_id = u.id
            WHERE ca.campaign_id = $1
            ORDER BY leads DESC, clicks DESC
        `;
        const result = await pool.query(query, [id]);

        return NextResponse.json({ performance: result.rows });
    } catch (error: any) {
        console.error('Failed to fetch campaign analytics:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
