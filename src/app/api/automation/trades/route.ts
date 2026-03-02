import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { automationTrades } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const engineId = searchParams.get('engine_id');

        if (!engineId) return NextResponse.json({ error: "Missing engine_id" }, { status: 400 });

        const mode = searchParams.get('mode') || 'demo';
        const trades = await db.select().from(automationTrades)
            .where(and(
                eq(automationTrades.user_id, session.user.id),
                eq(automationTrades.engine_id, engineId),
                eq(automationTrades.mode, mode)
            ))
            .orderBy(desc(automationTrades.created_at))
            .limit(20);

        return NextResponse.json({ trades });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
