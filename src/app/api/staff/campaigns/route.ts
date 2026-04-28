import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaignAssignments, campaigns, campaignAnalytics } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { eq, count, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const myAssignments = await db.select({
            id: campaignAssignments.id,
            unique_code: campaignAssignments.unique_code,
            short_url: campaignAssignments.short_url,
            status: campaignAssignments.status,
            campaign_id: campaigns.id,
            campaign_name: campaigns.name,
            campaign_description: campaigns.description,
            landing_page: campaigns.landing_page_url,
            resources: campaigns.resources,
        })
        .from(campaignAssignments)
        .innerJoin(campaigns, eq(campaignAssignments.campaign_id, campaigns.id))
        .where(eq(campaignAssignments.staff_id, session.user.id));

        // Let's also attach some quick stats to each assignment
        const stats = await Promise.all(myAssignments.map(async (asgn) => {
            const [clicks] = await db.select({ value: count() })
                .from(campaignAnalytics)
                .where(eq(campaignAnalytics.assignment_id, asgn.id));
            
            const [leads] = await db.select({ value: count() })
                .from(campaignAnalytics)
                .where(sql`${campaignAnalytics.assignment_id} = ${asgn.id} AND ${campaignAnalytics.event_type} = 'LEAD'`);

            return {
                ...asgn,
                clicks: clicks.value,
                leads: leads.value,
            };
        }));

        return NextResponse.json({ campaigns: stats });
    } catch (error) {
        console.error('Failed to fetch staff campaigns:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
