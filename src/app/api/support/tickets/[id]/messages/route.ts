import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets, ticketMessages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { message, attachmentUrl } = body;

        if (!message && !attachmentUrl) {
            return NextResponse.json({ error: "Message content or attachment required" }, { status: 400 });
        }

        // Authenticate User
        const cookieStore = await cookies();
        const token = cookieStore.get('access_token')?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: "Invalid user session" }, { status: 401 });
        }

        // Validate ticket exists and belongs to user
        const ticketData = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
        if (!ticketData.length) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        if (ticketData[0].user_id !== payload.userId) {
            return NextResponse.json({ error: "Forbidden: You do not own this ticket" }, { status: 403 });
        }

        // Insert message as user
        const [newMessage] = await db.insert(ticketMessages).values({
            ticket_id: id,
            sender_id: payload.userId,
            sender_type: "user",
            message: message || '',
            attachment_url: attachmentUrl,
            read_status: false,
        }).returning();

        return NextResponse.json({ success: true, messageId: newMessage.id });

    } catch (error) {
        console.error("User message POST error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
