import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allCampaigns = await db.select().from(campaigns).orderBy(desc(campaigns.created_at));
        return NextResponse.json({ campaigns: allCampaigns });
    } catch (error) {
        console.error('Failed to fetch campaigns:', error);
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
        const { name, description, landing_page_url, resources } = body;

        if (!name || !description) {
            return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
        }

        const [newCampaign] = await db.insert(campaigns).values({
            name,
            description,
            landing_page_url: landing_page_url || '/register',
            resources: resources ? JSON.stringify(resources) : null,
        }).returning();

        return NextResponse.json({ campaign: newCampaign });
    } catch (error) {
        console.error('Failed to create campaign:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
