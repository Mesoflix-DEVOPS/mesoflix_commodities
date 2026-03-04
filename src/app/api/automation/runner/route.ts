import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { automationDeployments, automationTrades } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getValidSession } from "@/lib/capital-service";
import { getMarketPrices, placeOrder, closePosition, getPositions, getHistory, getMarketTickers } from "@/lib/capital";
import { AurumVelocityEngine, AurumMomentumEngine, AurumApexEngine, Candle } from "@/lib/automation/engines/gold";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const userId = session.user.id;

        const activeDeployments = await db.select().from(automationDeployments)
            .where(and(eq(automationDeployments.user_id, userId), eq(automationDeployments.status, "Running")));

        if (!activeDeployments.length) return NextResponse.json({ message: "No active engines", executed: 0 });

        for (const dep of activeDeployments) {
            try {
                if (dep.commodity !== "gold") continue;
                console.info(`[Runner] Ticking engine: ${dep.engine_id} (${dep.mode}) for user: ${userId}`);

                // 0. Get Session for THIS deployment mode
                const capSession = await getValidSession(userId, dep.mode === 'demo');
                const { cst, xSecurityToken: xst } = capSession;

                // Fetch Live Positions for THIS account
                const { positions: capPositions } = await getPositions(cst, xst, dep.mode === 'demo');

                // Check Cooldown
                if (dep.cooldown_until && new Date() < new Date(dep.cooldown_until)) continue;

                const epic = "GOLD";
                let resolution: any = "MINUTE_5";
                let engineClass: any = AurumVelocityEngine;

                if (dep.engine_id === "aurum-velocity") { resolution = "MINUTE"; engineClass = AurumVelocityEngine; }
                else if (dep.engine_id === "aurum-momentum") { resolution = "HOUR"; engineClass = AurumMomentumEngine; }
                else if (dep.engine_id === "aurum-apex") { resolution = "HOUR_4"; engineClass = AurumApexEngine; }

                const priceRes = await getMarketPrices(cst, xst, epic, resolution, 100, dep.mode === 'demo');
                if (!priceRes || !priceRes.prices) continue;

                const candles: Candle[] = priceRes.prices.map((p: any) => ({
                    timestamp: p.snapshotTime,
                    open: p.openPrice.ask,
                    high: p.highPrice.ask,
                    low: p.lowPrice.ask,
                    close: p.closePrice.ask,
                    volume: p.lastTradedVolume || 1
                }));

                const latestPrice = candles[candles.length - 1].close;

                // 1. SYNC & CLOSURE DETECTION
                const openTrades = await db.select().from(automationTrades)
                    .where(and(
                        eq(automationTrades.deployment_id, dep.id),
                        eq(automationTrades.user_id, userId),
                        eq(automationTrades.status, "Open")
                    ));

                let basketPnl = 0;
                for (const trade of openTrades) {
                    const stillOpen = capPositions.find((p: any) => p.dealId === trade.deal_id);
                    if (!stillOpen) {
                        const history = await getHistory(cst, xst, dep.mode === 'demo', { max: 10 });
                        const historyItem = history?.activities?.find((a: any) => a.dealId === trade.deal_id && a.action === "POSITION_CLOSED");
                        const finalPnl = historyItem ? parseFloat(historyItem.result) : 0;

                        if (finalPnl < 0) {
                            const cooldown = new Date();
                            cooldown.setMinutes(cooldown.getMinutes() + 5);
                            await db.update(automationDeployments).set({ cooldown_until: cooldown }).where(eq(automationDeployments.id, dep.id));
                        }

                        const currentTotal = parseFloat(dep.pnl || "0");
                        await db.update(automationDeployments).set({ pnl: (currentTotal + finalPnl).toString() }).where(eq(automationDeployments.id, dep.id));
                        await db.update(automationTrades).set({
                            pnl: finalPnl.toString(),
                            close_price: latestPrice.toString(),
                            status: "Closed"
                        }).where(eq(automationTrades.id, trade.id));
                        continue;
                    }

                    const openPrice = parseFloat(trade.open_price || "0");
                    const unrealized = trade.direction === "BUY"
                        ? (latestPrice - openPrice) * parseFloat(trade.size)
                        : (openPrice - latestPrice) * parseFloat(trade.size);

                    // Real-time Sync: Update the trade's PNL in the DB so it reflects in the dashboard
                    await db.update(automationTrades).set({ pnl: unrealized.toString() }).where(eq(automationTrades.id, trade.id));

                    basketPnl += unrealized;
                }

                // 2. EXIT LOGIC
                const targetProfit = parseFloat(dep.target_profit || "999999");
                if (basketPnl >= targetProfit) {
                    for (const t of openTrades) {
                        try { await closePosition(cst, xst, t.deal_id, dep.mode === 'demo'); } catch { }
                    }
                    await db.update(automationDeployments).set({ status: "Target Achieved", last_decision_reason: `Target of $${targetProfit} reached.` }).where(eq(automationDeployments.id, dep.id));
                    continue;
                }

                // 3. ENTRY & LIVE PRICE
                const tickerRes = await getMarketTickers(cst, xst, [epic], dep.mode === 'demo');
                const marketInfo = tickerRes?.markets?.[0]?.snapshot;
                const currentBid = marketInfo?.bid || latestPrice;
                const currentOffer = marketInfo?.offer || latestPrice;
                const currentSpread = Math.abs(currentOffer - currentBid);

                const signal = engineClass.analyze(candles, currentSpread, dep.risk_level || 'Balanced');
                if (signal.direction !== "NEUTRAL" && openTrades.length < 3) {
                    const capital = parseFloat(dep.allocated_capital);
                    const riskPerTrade = capital * (signal.riskPercentage / 100);

                    // Dynamic Size Calculation based on Stop Loss distance
                    // Formula: Size = (Capital * Risk%) / |Entry - SL|
                    const entryPrice = signal.direction === "BUY" ? currentBid : currentOffer;
                    const slDistance = Math.abs(entryPrice - (signal.stopLoss || entryPrice - 5));

                    // Min Lot Size for GOLD is typically 0.1 on many CFD platforms, 
                    // but we floor to 2 decimal places to be safe and precise.
                    let calculatedSize = slDistance > 0 ? riskPerTrade / slDistance : 0.1;

                    // Cap and Floor for safety
                    const size = Math.max(0.1, parseFloat(calculatedSize.toFixed(2)));

                    const orderRes = await placeOrder(cst, xst, epic, signal.direction, size, dep.mode === 'demo', {
                        takeProfit: signal.targetPrice,
                        stopLoss: signal.stopLoss
                    });

                    if (orderRes && orderRes.dealReference) {
                        const entryPrice = signal.direction === "BUY" ? currentBid : currentOffer;
                        await db.insert(automationTrades).values({
                            user_id: userId,
                            deployment_id: dep.id,
                            engine_id: dep.engine_id,
                            deal_id: orderRes.dealReference,
                            epic: epic,
                            direction: signal.direction,
                            size: size.toString(),
                            open_price: entryPrice.toString(),
                            pnl: "0",
                            mode: dep.mode || "demo",
                            status: "Open"
                        });
                    }
                } else {
                    await db.update(automationDeployments).set({ last_decision_reason: signal.reasoning }).where(eq(automationDeployments.id, dep.id));
                }
            } catch (innerError: any) {
                console.error(`[RunnerAPI Engine Error for ${dep.engine_id}]:`, innerError);
                // Continue to next engine even if one fails
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("[RunnerAPI Error]:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
