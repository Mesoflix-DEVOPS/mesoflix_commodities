import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { automationTrades } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const engineId = searchParams.get('engine_id');

        if (!engineId) return NextResponse.json({ error: "Missing engine_id" }, { status: 400 });

        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        const trades = await db.select().from(automationTrades)
            .where(and(
                eq(automationTrades.user_id, session.user.id),
                eq(automationTrades.engine_id, engineId),
                gte(automationTrades.created_at, oneDayAgo)
            ));

        const closedTrades = trades.filter(t => t.status === 'Closed');
        const wins = closedTrades.filter(t => parseFloat(t.pnl || "0") > 0);

        const winRate = closedTrades.length > 0
            ? ((wins.length / closedTrades.length) * 100).toFixed(1) + "%"
            : "0%";

        const grossProfit = wins.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0);
        const grossLoss = Math.abs(closedTrades.filter(t => parseFloat(t.pnl || "0") < 0).reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0));

        const profitFactor = grossLoss === 0
            ? (grossProfit > 0 ? "MAX" : "0.0")
            : (grossProfit / grossLoss).toFixed(2);

        const totalPnl = trades.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0);

        return NextResponse.json({
            winRate,
            profitFactor,
            totalTrades: trades.filter(t => t.status === 'Open').length,
            netPnl: totalPnl.toFixed(2),
            closedCount: closedTrades.length
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
