import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('c');

    if (!code) {
        return NextResponse.redirect(new URL('/', req.url));
    }

    try {
        // Institutional-grade lookup: Find assignment and landing page in one pass
        const lookupQuery = `
            SELECT 
                ca.id, 
                c.landing_page_url 
            FROM campaign_assignments ca
            INNER JOIN campaigns c ON ca.campaign_id = c.id
            WHERE ca.unique_code = $1 
            LIMIT 1
        `;
        const lookupRes = await pool.query(lookupQuery, [code]);
        const assignment = lookupRes.rows[0];

        if (!assignment) {
            console.warn(`[Tracking] Invalid campaign code attempted: ${code}`);
            return NextResponse.redirect(new URL('/', req.url));
        }

        // Failsafe Analytics Insertion
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const ua = req.headers.get('user-agent') || 'unknown';

        const insertQuery = `
            INSERT INTO campaign_analytics (assignment_id, event_type, ip_address, user_agent)
            VALUES ($1, 'CLICK', $2, $3)
        `;
        
        // We don't await this to keep the redirection fast, 
        // OR we await it for data integrity. Let's await for reliability.
        await pool.query(insertQuery, [assignment.id, ip, ua]);

        // Persistence Layer: Store assignment ID for conversion (Lead generation) tracking
        const cookieStore = await cookies();
        cookieStore.set('campaign_assignment_id', assignment.id, {
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax'
        });

        // Final Bridge: Redirect to the target landing page
        return NextResponse.redirect(new URL(assignment.landing_page_url, req.url));

    } catch (error: any) {
        console.error('Campaign Tracking Terminal Error:', error);
        // Emergency fallback: send user home so they don't see a 500 page
        return NextResponse.redirect(new URL('/', req.url));
    }
}
