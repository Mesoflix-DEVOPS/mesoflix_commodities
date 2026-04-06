import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_must_change_in_prod'
);

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await req.json();
        const { meet_link, onboarding_status, status } = body;

        // Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('agent_session')?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        try {
            await jose.jwtVerify(token, JWT_SECRET);
        } catch (e) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        const updateData: any = {};
        if (meet_link !== undefined) updateData.meet_link = meet_link;
        if (onboarding_status !== undefined) updateData.onboarding_status = onboarding_status;
        if (status !== undefined) updateData.status = status;

        await db.update(tickets)
            .set(updateData)
            .where(eq(tickets.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Ticket update error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
        if (!ticket) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        return NextResponse.json({ ticket });
    } catch (error) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
