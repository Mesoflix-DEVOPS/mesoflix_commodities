import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Fetch all assignments to see if ANY exist
        const allAssignments = await pool.query('SELECT * FROM campaign_assignments');
        
        let staffId = null;
        if (allAssignments.rows.length > 0) {
            staffId = allAssignments.rows[0].staff_id;
        }

        // Run the complex query just like the dashboard does
        const complexQuery = `
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
        let complexResult = null;
        let complexError = null;
        try {
            if (staffId) {
                complexResult = await pool.query(complexQuery, [staffId]);
            }
        } catch (e: any) {
            complexError = e.message;
        }

        return NextResponse.json({
            totalAssignmentsInDB: allAssignments.rows.length,
            complexQueryResult: complexResult ? complexResult.rows : null,
            complexQueryError: complexError
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
