import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const query = `
            SELECT 
                ca.id,
                ca.campaign_id,
                ca.staff_id,
                ca.unique_code,
                ca.custom_alias,
                ca.short_url,
                ca.status,
                ca.created_at,
                u.email as staff_email,
                u.full_name as staff_name,
                c.name as campaign_name,
                (SELECT COUNT(*) FROM campaign_analytics WHERE assignment_id = ca.id AND event_type = 'CLICK') as clicks,
                (SELECT COUNT(*) FROM campaign_analytics WHERE assignment_id = ca.id AND event_type = 'LEAD') as leads,
                (SELECT COUNT(*) FROM campaign_analytics WHERE assignment_id = ca.id AND event_type = 'CONVERSION') as conversions
            FROM campaign_assignments ca
            LEFT JOIN users u ON ca.staff_id = u.id
            LEFT JOIN campaigns c ON ca.campaign_id = c.id
            ORDER BY ca.created_at DESC
        `;
        
        const result = await pool.query(query);

        const assignments = result.rows.map(r => ({
            ...r,
            clicks: parseInt(r.clicks || '0'),
            leads: parseInt(r.leads || '0'),
            conversions: parseInt(r.conversions || '0')
        }));

        return NextResponse.json({ assignments });
    } catch (error: any) {
        console.error('Failed to fetch assignments:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { campaign_id, staff_id } = body;

        if (!campaign_id || !staff_id) {
            return NextResponse.json({ error: 'Campaign ID and Staff ID are required' }, { status: 400 });
        }

        // Institutional Check: Verify existing node
        const checkQuery = 'SELECT id FROM campaign_assignments WHERE campaign_id = $1 AND staff_id = $2 LIMIT 1';
        const existing = await pool.query(checkQuery, [campaign_id, staff_id]);

        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Staff is already assigned to this campaign' }, { status: 400 });
        }

        // Generate Protocol Identity
        const unique_code = uuidv4().split('-')[0];

        const insertQuery = `
            INSERT INTO campaign_assignments (campaign_id, staff_id, unique_code, short_url)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(insertQuery, [
            campaign_id,
            staff_id,
            unique_code,
            `/c/${unique_code}`
        ]);

        return NextResponse.json({ assignment: result.rows[0] });
    } catch (error: any) {
        console.error('Failed to create assignment:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
