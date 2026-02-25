import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets, ticketMessages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_must_change_in_prod'
);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ error: "Message content required" }, { status: 400 });
        }

        // Authenticate Agent
        const cookieStore = await cookies();
        const token = cookieStore.get('agent_session')?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        let payload;
        try {
            const result = await jose.jwtVerify(token, JWT_SECRET);
            payload = result.payload;
        } catch (e) {
            return NextResponse.json({ error: "Invalid or expired agent session" }, { status: 401 });
        }

        // Validate ticket exists
        const ticketData = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
        if (!ticketData.length) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        // Insert message as agent
        const [newMessage] = await db.insert(ticketMessages).values({
            ticket_id: id,
            sender_id: payload.sub as string,
            sender_type: "agent",
            message: message,
            read_status: false,
        }).returning();

        // Optional: change ticket status to PENDING if it was OPEN (agent responded)
        if (ticketData[0].status === "OPEN") {
            await db.update(tickets)
                .set({ status: "PENDING", assigned_agent_id: payload.sub as string })
                .where(eq(tickets.id, id));
        }

        return NextResponse.json({ success: true, messageId: newMessage.id });

    } catch (error) {
        console.error("Agent message POST error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
