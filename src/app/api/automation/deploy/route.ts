import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { automationDeployments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        const body = await req.json();

        const { engine_id, commodity, allocated_capital, risk_multiplier, stop_loss_cap, action, status } = body;

        // Action: Update existing deployment state
        if (action === "update_state") {
            await db.update(automationDeployments)
                .set({ status, updated_at: new Date() })
                .where(and(eq(automationDeployments.user_id, userId), eq(automationDeployments.engine_id, engine_id)));
            return NextResponse.json({ success: true, message: "Engine state updated." });
        }

        // Action: New Deploy
        // Upsert logic (if user has it deployed already, just update params)
        const existing = await db.select().from(automationDeployments)
            .where(and(eq(automationDeployments.user_id, userId), eq(automationDeployments.engine_id, engine_id)));

        if (existing.length > 0) {
            await db.update(automationDeployments)
                .set({
                    allocated_capital: allocated_capital.toString(),
                    risk_multiplier: risk_multiplier.toString(),
                    stop_loss_cap: stop_loss_cap.toString(),
                    status: "Running",
                    updated_at: new Date()
                })
                .where(eq(automationDeployments.id, existing[0].id));
        } else {
            await db.insert(automationDeployments).values({
                user_id: userId,
                engine_id,
                commodity,
                allocated_capital: allocated_capital.toString(),
                risk_multiplier: risk_multiplier.toString(),
                stop_loss_cap: stop_loss_cap.toString(),
                status: "Running",
                mode: "demo", // Currently locked to demo for safety during execution loops
            });
        }

        return NextResponse.json({ success: true, message: "Engine deployed successfully via API." });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to deploy engine" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const deps = await db.select().from(automationDeployments)
            .where(eq(automationDeployments.user_id, session.user.id));

        return NextResponse.json({ deployments: deps });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
