import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets, ticketMessages } from '@/lib/db/schema';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth';

const getUserIdFromSession = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;

    if (!token) return null;

    const payload = await verifyAccessToken(token);
    return payload ? payload.userId : null;
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { category, subject, description } = body;

        if (!category || !subject || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Fetch actual user via session layer
        const userId = await getUserIdFromSession();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        const [newTicket] = await db.insert(tickets).values({
            user_id: userId,
            category,
            subject,
            description,
            status: "OPEN",
            priority: "NORMAL",
        }).returning();

        // Automatically insert the initial description as the very first message in the chat
        await db.insert(ticketMessages).values({
            ticket_id: newTicket.id,
            sender_id: userId,
            sender_type: "user",
            message: description,
            read_status: false,
        });

        return NextResponse.json({
            success: true,
            ticketId: newTicket.id
        });

    } catch (error) {
        console.error("Failed to create ticket:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
