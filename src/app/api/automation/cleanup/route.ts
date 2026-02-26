import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { automationDeployments, automationTrades } from "@/lib/db/schema";
import { lt } from "drizzle-orm";

// In production, this would be hit via Vercel Cron or a separate scheduler.
export async function POST(req: Request) {
    try {
        // Enforce the PRD rule: "any data we save in the database for this engine will be strictly deleted after every 24 hours"

        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        // Delete trades strictly older than 24 hours
        const deletedTrades = await db.delete(automationTrades)
            .where(lt(automationTrades.created_at, oneDayAgo))
            .returning({ id: automationTrades.id });

        // Delete stopped/stale deployments older than 24h
        const deletedDeployments = await db.delete(automationDeployments)
            .where(lt(automationDeployments.created_at, oneDayAgo))
            .returning({ id: automationDeployments.id });

        return NextResponse.json({
            success: true,
            message: "Automation platform daily purge executed successfully.",
            tradesPurged: deletedTrades.length,
            deploymentsPurged: deletedDeployments.length
        });
    } catch (e: any) {
        console.error("Cleanup cron failed:", e);
        return NextResponse.json({ error: "Failed to purge database", details: e.message }, { status: 500 });
    }
}
