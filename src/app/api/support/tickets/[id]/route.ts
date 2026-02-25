import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets, ticketMessages } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const ticketData = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
        if (!ticketData.length) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        const messages = await db
            .select()
            .from(ticketMessages)
            .where(eq(ticketMessages.ticket_id, id))
            .orderBy(asc(ticketMessages.created_at));

        return NextResponse.json({
            ticket: ticketData[0],
            messages,
        });

    } catch (error) {
        console.error("Failed to fetch ticket info:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();

        if (body.status === "CLOSED") {
            await db.update(tickets)
                .set({ status: "CLOSED" })
                .where(eq(tickets.id, id));

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    } catch (error) {
        console.error("Failed to close ticket:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
