import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Optimized Institutional Query: Get assignments and stats in one bridge pass
        const query = `
            SELECT 
                ca.id,
                ca.unique_code,
                ca.custom_alias,
                ca.short_url,
                ca.status,
                c.id as campaign_id,
                c.name as campaign_name,
                c.description as campaign_description,
                c.landing_page_url as landing_page,
                c.resources,
                COUNT(an.id) FILTER (WHERE an.event_type = 'CLICK') as clicks,
                COUNT(an.id) FILTER (WHERE an.event_type = 'LEAD') as leads,
                COUNT(an.id) FILTER (WHERE an.event_type = 'CONVERSION') as conversions
            FROM campaign_assignments ca
            INNER JOIN campaigns c ON ca.campaign_id = c.id
            LEFT JOIN campaign_analytics an ON an.assignment_id = ca.id
            WHERE ca.staff_id = $1
            GROUP BY ca.id, c.id, ca.custom_alias
        `;
        
        const result = await pool.query(query, [userId]);

        const stats = result.rows.map(r => ({
            ...r,
            clicks: parseInt(r.clicks || '0'),
            leads: parseInt(r.leads || '0'),
            conversions: parseInt(r.conversions || '0'),
        }));

        return NextResponse.json({ campaigns: stats });
    } catch (error: any) {
        console.error('Staff Terminal Data Breach/Error:', error);
        return NextResponse.json({ 
            error: 'Database Synchronization Error', 
            details: error.message 
        }, { status: 500 });
    }
}
