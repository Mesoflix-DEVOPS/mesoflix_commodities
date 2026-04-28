import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaignAssignments, users, campaigns, campaignAnalytics } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const assignments = await db.select({
            id: campaignAssignments.id,
            campaign_id: campaignAssignments.campaign_id,
            staff_id: campaignAssignments.staff_id,
            unique_code: campaignAssignments.unique_code,
            short_url: campaignAssignments.short_url,
            status: campaignAssignments.status,
            created_at: campaignAssignments.created_at,
            staff_email: users.email,
            staff_name: users.full_name,
            campaign_name: campaigns.name,
            clicks: sql<number>`(SELECT count(*) FROM ${campaignAnalytics} WHERE ${campaignAnalytics.assignment_id} = ${campaignAssignments.id} AND ${campaignAnalytics.event_type} = 'CLICK')`,
            leads: sql<number>`(SELECT count(*) FROM ${campaignAnalytics} WHERE ${campaignAnalytics.assignment_id} = ${campaignAssignments.id} AND ${campaignAnalytics.event_type} = 'LEAD')`,
        })
        .from(campaignAssignments)
        .leftJoin(users, eq(campaignAssignments.staff_id, users.id))
        .leftJoin(campaigns, eq(campaignAssignments.campaign_id, campaigns.id))
        .orderBy(desc(campaignAssignments.created_at));

        return NextResponse.json({ assignments });
    } catch (error) {
        console.error('Failed to fetch assignments:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

        // Check if already assigned
        const existing = await db.select().from(campaignAssignments).where(
            and(
                eq(campaignAssignments.campaign_id, campaign_id),
                eq(campaignAssignments.staff_id, staff_id)
            )
        );

        if (existing.length > 0) {
            return NextResponse.json({ error: 'Staff is already assigned to this campaign' }, { status: 400 });
        }

        // Generate unique code (short version of uuid or random string)
        const unique_code = uuidv4().split('-')[0];

        const [newAssignment] = await db.insert(campaignAssignments).values({
            campaign_id,
            staff_id,
            unique_code,
            short_url: `/c/${unique_code}`,
        }).returning();

        return NextResponse.json({ assignment: newAssignment });
    } catch (error) {
        console.error('Failed to create assignment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
