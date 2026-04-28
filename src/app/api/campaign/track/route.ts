import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaignAssignments, campaigns, campaignAnalytics } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('c');

    if (!code) {
        return NextResponse.redirect(new URL('/', req.url));
    }

    try {
        // Find the assignment
        const [assignment] = await db.select({
            id: campaignAssignments.id,
            campaign_id: campaignAssignments.campaign_id,
            landing_page: campaigns.landing_page_url,
        })
        .from(campaignAssignments)
        .innerJoin(campaigns, eq(campaignAssignments.campaign_id, campaigns.id))
        .where(eq(campaignAssignments.unique_code, code))
        .limit(1);

        if (!assignment) {
            return NextResponse.redirect(new URL('/', req.url));
        }

        // Record the click
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const ua = req.headers.get('user-agent') || 'unknown';

        await db.insert(campaignAnalytics).values({
            assignment_id: assignment.id,
            event_type: 'CLICK',
            ip_address: ip,
            user_agent: ua,
        });

        // Store the assignment ID in a cookie so we can track later conversion (registration)
        const cookieStore = await cookies();
        cookieStore.set('campaign_assignment_id', assignment.id, {
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
        });

        // Redirect to the landing page
        const redirectUrl = new URL(assignment.landing_page, req.url);
        return NextResponse.redirect(redirectUrl);

    } catch (error) {
        console.error('Tracking failed:', error);
        return NextResponse.redirect(new URL('/', req.url));
    }
}
