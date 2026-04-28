import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaignAnalytics, campaignAssignments, campaigns, users } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { count, eq, sql, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Global Stats
        const [totalClicks] = await db.select({ value: count() })
            .from(campaignAnalytics)
            .where(eq(campaignAnalytics.event_type, 'CLICK'));

        const [totalLeads] = await db.select({ value: count() })
            .from(campaignAnalytics)
            .where(eq(campaignAnalytics.event_type, 'LEAD'));

        // Staff Performance
        const staffStats = await db.select({
            staff_id: campaignAssignments.staff_id,
            staff_name: users.full_name,
            staff_email: users.email,
            campaign_id: campaignAssignments.campaign_id,
            campaign_name: campaigns.name,
            clicks: sql<number>`count(case when ${campaignAnalytics.event_type} = 'CLICK' then 1 end)`,
            leads: sql<number>`count(case when ${campaignAnalytics.event_type} = 'LEAD' then 1 end)`,
        })
        .from(campaignAssignments)
        .leftJoin(users, eq(campaignAssignments.staff_id, users.id))
        .leftJoin(campaigns, eq(campaignAssignments.campaign_id, campaigns.id))
        .leftJoin(campaignAnalytics, eq(campaignAnalytics.assignment_id, campaignAssignments.id))
        .groupBy(
            campaignAssignments.staff_id, 
            users.full_name, 
            users.email, 
            campaignAssignments.campaign_id, 
            campaigns.name
        )
        .orderBy(desc(sql`leads`));

        // Global Timeline (Last 14 days)
        const timeline = await db.select({
            date: sql<string>`DATE(${campaignAnalytics.created_at})`,
            type: campaignAnalytics.event_type,
            count: count(),
        })
        .from(campaignAnalytics)
        .where(sql`${campaignAnalytics.created_at} > NOW() - INTERVAL '14 days'`)
        .groupBy(sql`DATE(${campaignAnalytics.created_at})`, campaignAnalytics.event_type)
        .orderBy(sql`DATE(${campaignAnalytics.created_at})`);

        return NextResponse.json({
            stats: {
                clicks: Number(totalClicks?.value || 0),
                leads: Number(totalLeads?.value || 0),
            },
            staffPerformance: staffStats,
            timeline: timeline
        });

    } catch (error: any) {
        console.error('Failed to fetch global campaign analytics:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
