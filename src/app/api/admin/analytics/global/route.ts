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

        // 1. Fetch Global Aggregate Stats
        const statsQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE event_type = 'CLICK') as clicks,
                COUNT(*) FILTER (WHERE event_type = 'LEAD') as leads
            FROM campaign_analytics
        `;
        const statsRes = await pool.query(statsQuery);
        const stats = statsRes.rows[0];

        // 2. Fetch Staff Performance
        const staffQuery = `
            SELECT 
                ca.staff_id,
                u.full_name as staff_name,
                u.email as staff_email,
                ca.campaign_id,
                c.name as campaign_name,
                COUNT(an.id) FILTER (WHERE an.event_type = 'CLICK') as clicks,
                COUNT(an.id) FILTER (WHERE an.event_type = 'LEAD') as leads
            FROM campaign_assignments ca
            LEFT JOIN users u ON ca.staff_id = u.id
            LEFT JOIN campaigns c ON ca.campaign_id = c.id
            LEFT JOIN campaign_analytics an ON an.assignment_id = ca.id
            GROUP BY ca.staff_id, u.full_name, u.email, ca.campaign_id, c.name
            ORDER BY leads DESC
        `;
        const staffRes = await pool.query(staffQuery);

        // 3. Fetch Timeline (Last 14 days)
        const timelineQuery = `
            SELECT 
                DATE(created_at) as date,
                event_type as type,
                COUNT(*) as count
            FROM campaign_analytics
            WHERE created_at > NOW() - INTERVAL '14 days'
            GROUP BY DATE(created_at), event_type
            ORDER BY DATE(created_at) ASC
        `;
        const timelineRes = await pool.query(timelineQuery);

        return NextResponse.json({
            stats: {
                clicks: parseInt(stats.clicks || '0'),
                leads: parseInt(stats.leads || '0'),
            },
            staffPerformance: staffRes.rows.map(r => ({
                ...r,
                clicks: parseInt(r.clicks || '0'),
                leads: parseInt(r.leads || '0')
            })),
            timeline: timelineRes.rows.map(r => ({
                ...r,
                count: parseInt(r.count || '0')
            }))
        });

    } catch (error: any) {
        console.error('Institutional Analytics Terminal Error:', error);
        
        // Failsafe empty response to keep UI alive
        return NextResponse.json({ 
            error: 'Security Bridge Warning: Partial Data Sync', 
            details: error.message,
            stats: { clicks: 0, leads: 0 },
            staffPerformance: [],
            timeline: []
        }, { status: 500 });
    }
}
