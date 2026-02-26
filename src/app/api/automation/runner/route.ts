import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { automationDeployments, automationTrades } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getValidSession } from "@/lib/capital-service";
import { getMarketPrices, placeOrder } from "@/lib/capital";
import { AurumVelocityEngine, AurumMomentumEngine, AurumApexEngine, Candle } from "@/lib/automation/engines/gold";

// To prevent abuse, only allow POST requests to run the engine loop
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;

        // Fetch running engines for this user
        const activeDeployments = await db.select().from(automationDeployments)
            .where(and(eq(automationDeployments.user_id, userId), eq(automationDeployments.status, "Running")));

        if (!activeDeployments.length) {
            return NextResponse.json({ message: "No active engines running", executed: 0 });
        }

        // We assume all deployments for now use the same mode, otherwise we group by mode
        let executedTrades = 0;
        let cst = "";
        let xst = "";

        try {
            const capSession = await getValidSession(userId, activeDeployments[0].mode === 'demo');
            cst = capSession.cst;
            xst = capSession.xSecurityToken;
        } catch (e) {
            return NextResponse.json({ error: "Capital.com connection failed. Cannot run engines." }, { status: 500 });
        }

        // Loop through deployments and run strategies
        for (const dep of activeDeployments) {
            if (dep.commodity !== "gold") continue; // We only have gold engines built so far per PRD

            const epic = "GOLD"; // Capital.com epic for Gold

            // Map engines to timeframe resolutions
            let resolution: any = "MINUTE_5";
            let engineClass: any = AurumVelocityEngine;

            if (dep.engine_id === "aurum-velocity") {
                resolution = "MINUTE_5";
                engineClass = AurumVelocityEngine;
            } else if (dep.engine_id === "aurum-momentum") {
                resolution = "HOUR";
                engineClass = AurumMomentumEngine;
            } else if (dep.engine_id === "aurum-apex") {
                resolution = "HOUR_4";
                engineClass = AurumApexEngine;
            }

            // 1. Fetch historical OHLCV candles
            const priceRes = await getMarketPrices(cst, xst, epic, resolution, 200, dep.mode === 'demo');
            if (!priceRes || !priceRes.prices) continue;

            const candles: Candle[] = priceRes.prices.map((p: any) => ({
                timestamp: p.snapshotTime,
                open: p.openPrice.ask,
                high: p.highPrice.ask,
                low: p.lowPrice.ask,
                close: p.closePrice.ask,
            }));

            // 2. Run Engine Mathematics
            const signal = engineClass.analyze(candles);

            // 3. Execute Trade if Signal Triggered
            if (signal.direction === "BUY" || signal.direction === "SELL") {
                // Calculate size based on capital, risk, and multiplier
                const capital = parseFloat(dep.allocated_capital);
                const multiplier = parseFloat(dep.risk_multiplier || "1.0");
                const riskAmount = capital * (signal.riskPercentage / 100) * multiplier;

                // Very crude sizing logic for demo purposes (Gold margin standard)
                const size = Math.max(1, Math.floor(riskAmount / 10)); // Arbitrary 1-to-10 scale for testing

                try {
                    const orderRes = await placeOrder(cst, xst, epic, signal.direction, size, dep.mode === 'demo', {
                        takeProfit: signal.targetPrice,
                        stopLoss: signal.stopLoss
                    });

                    // Wait for Capital.com deal ID
                    if (orderRes && orderRes.dealReference) {
                        try {
                            // 4. Save to Postgres
                            await db.insert(automationTrades).values({
                                user_id: userId,
                                deployment_id: dep.id,
                                engine_id: dep.engine_id,
                                deal_id: orderRes.dealReference,
                                epic: epic,
                                direction: signal.direction,
                                size: size.toString(),
                                open_price: candles[candles.length - 1].close.toString(),
                                pnl: "0",
                                mode: dep.mode || "demo"
                            });
                            executedTrades++;
                        } catch (dbErr) {
                            console.error("Failed to save automation trade to DB", dbErr);
                        }
                    }
                } catch (tradeErr) {
                    console.error(`Engine ${dep.engine_id} failed to execute trade:`, tradeErr);
                }
            }
        }

        return NextResponse.json({ message: "Engine execution cycle completed", executedTrades });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Unknown error in engine runner" }, { status: 500 });
    }
}
