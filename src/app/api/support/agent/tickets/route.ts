import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets, ticketMessages } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_secret_must_change_in_prod'
);

export async function GET(req: Request) {
    try {
        // Enforce Agent Authentication Middleware Logic
        const cookieStore = await cookies();
        const token = cookieStore.get('agent_session')?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        try {
            await jose.jwtVerify(token, JWT_SECRET);
        } catch (e) {
            return NextResponse.json({ error: "Invalid or expired agent session" }, { status: 401 });
        }

        // Fetch all tickets with their latest message snippet
        // In a real production app, we would paginate this and use a left join

        const allTickets = await db.select().from(tickets).orderBy(desc(tickets.created_at)).limit(100);

        // Fetch latest message for each tickt as a quick snippet
        const resolvedTickets = await Promise.all(allTickets.map(async (t) => {
            const latestMsg = await db.select()
                .from(ticketMessages)
                .where(eq(ticketMessages.ticket_id, t.id))
                .orderBy(desc(ticketMessages.created_at))
                .limit(1);

            return {
                ...t,
                last_message: latestMsg[0]?.message || "No messages yet.",
                unread: latestMsg[0]?.sender_type === "user" && !latestMsg[0]?.read_status
            }
        }));

        return NextResponse.json({ tickets: resolvedTickets });

    } catch (error) {
        console.error("Agent tickets fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
