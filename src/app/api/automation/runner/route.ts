import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, withRetry } from "@/lib/db";
import { automationDeployments, automationTrades } from "@/lib/db/schema";
import { eq, and, lt, gte } from "drizzle-orm";
import { getValidSession } from "@/lib/capital-service";
import { getMarketPrices, placeOrder, closePosition, getPositions, getHistory, getMarketTickers, getConfirm, updatePosition } from "@/lib/capital";
import { AurumVelocityEngine, AurumMomentumEngine, AurumApexEngine, Candle } from "@/lib/automation/engines/gold";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const userId = session.user.id;

        // --- PRD ENFORCEMENT: 24H DATA RETENTION ---
        // Trigger cleanup every tick to ensure strict 24h data lifecycle.
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        await db.delete(automationTrades).where(and(eq(automationTrades.user_id, userId), lt(automationTrades.created_at, oneDayAgo)));
        // Also cleanup old deployments that haven't been updated in 24h
        await db.delete(automationDeployments).where(and(eq(automationDeployments.user_id, userId), lt(automationDeployments.updated_at, oneDayAgo)));

        const activeDeployments = await withRetry(() => db.select().from(automationDeployments)
            .where(and(eq(automationDeployments.user_id, userId), eq(automationDeployments.status, "Running"))));

        if (!activeDeployments.length) return NextResponse.json({ message: "No active engines", executed: 0 });

        for (const dep of activeDeployments) {
            try {
                if (dep.commodity !== "gold") continue;
                console.info(`[Runner] Ticking engine: ${dep.engine_id} (${dep.mode}) for user: ${userId}`);

                // Update deployment timestamp to prevent cleanup
                await db.update(automationDeployments).set({ updated_at: new Date() }).where(eq(automationDeployments.id, dep.id));

                // 0. Get Session for THIS deployment mode
                const capSession = await getValidSession(userId, dep.mode === 'demo');
                const { cst, xSecurityToken: xst } = capSession;

                // Fetch Live Positions for THIS account
                const { positions: capPositions } = await getPositions(cst, xst, dep.mode === 'demo', capSession.serverUrl);

                // Check Cooldown
                if (dep.cooldown_until && new Date() < new Date(dep.cooldown_until)) continue;

                const epic = "GOLD";
                let resolution: any = "MINUTE_5";
                let engineClass: any = AurumVelocityEngine;

                if (dep.engine_id === "aurum-velocity") { resolution = "MINUTE"; engineClass = AurumVelocityEngine; }
                else if (dep.engine_id === "aurum-momentum") { resolution = "HOUR"; engineClass = AurumMomentumEngine; }
                else if (dep.engine_id === "aurum-apex") { resolution = "HOUR_4"; engineClass = AurumApexEngine; }

                const priceRes = await getMarketPrices(cst, xst, epic, resolution, 100, dep.mode === 'demo', capSession.serverUrl);
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
                        const history = await getHistory(cst, xst, dep.mode === 'demo', { max: 10 }, capSession.serverUrl);
                        const historyItem = history?.activities?.find((a: any) =>
                            a.dealId === trade.deal_id &&
                            (a.action === "POSITION_CLOSED" || a.action === "STOP_LOSS" || a.action === "TAKE_PROFIT" || a.status === "CLOSED" || a.status?.[0] === "CLOSED")
                        );

                        let finalPnl = trade.pnl ? parseFloat(trade.pnl) : 0;
                        if (historyItem) {
                            const extractedPnl = historyItem.details?.profitAndLoss ?? historyItem.details?.pl ?? historyItem.result;
                            if (extractedPnl !== undefined && extractedPnl !== null) {
                                finalPnl = typeof extractedPnl === 'string' ? parseFloat(extractedPnl) : extractedPnl;
                            }
                        }

                        if (finalPnl < 0) {
                            const cooldown = new Date();
                            cooldown.setMinutes(cooldown.getMinutes() + 5);
                            await withRetry(() => db.update(automationDeployments).set({ cooldown_until: cooldown }).where(eq(automationDeployments.id, dep.id)));
                        }

                        const currentTotal = parseFloat(dep.pnl || "0");
                        await withRetry(() => db.update(automationDeployments).set({ pnl: (currentTotal + finalPnl).toString() }).where(eq(automationDeployments.id, dep.id)));
                        await withRetry(() => db.update(automationTrades).set({
                            pnl: finalPnl.toString(),
                            close_price: latestPrice.toString(),
                            status: "Closed"
                        }).where(eq(automationTrades.id, trade.id)));
                        continue;
                    }

                    const openPrice = parseFloat(trade.open_price || "0");
                    const unrealized = trade.direction === "BUY"
                        ? (latestPrice - openPrice) * parseFloat(trade.size)
                        : (openPrice - latestPrice) * parseFloat(trade.size);

                    // Scalp Exit Optimization: 
                    // If scalp engine and in reasonable profit (0.15% price move), close immediately
                    const priceMovePct = Math.abs(latestPrice - openPrice) / openPrice;
                    const isReasonableProfit = unrealized > 0 && priceMovePct >= 0.0015;

                    if (dep.engine_id === "aurum-velocity" && isReasonableProfit) {
                        try {
                            console.log(`[Runner] Scalp Exit triggered for trade ${trade.deal_id} at ${priceMovePct.toFixed(4)}% move.`);
                            await closePosition(cst, xst, trade.deal_id, dep.mode === 'demo', capSession.serverUrl);
                            await withRetry(() => db.update(automationTrades).set({
                                status: "Closed",
                                pnl: unrealized.toString(),
                                close_price: latestPrice.toString()
                            }).where(eq(automationTrades.id, trade.id)));
                            continue;
                        } catch (e) {
                            console.error(`[Runner] Failed to auto-close scalp:`, e);
                        }
                    }

                    // Real-time Sync: Update the trade's PNL in the DB so it reflects in the dashboard
                    if (Math.abs(unrealized - parseFloat(trade.pnl || "0")) > 0.01) {
                        await withRetry(() => db.update(automationTrades).set({ pnl: unrealized.toString() }).where(eq(automationTrades.id, trade.id)));
                    }

                    // ---------------------------------------------------------------------------------
                    // Trailing Stop Logic (Aurum Momentum 3x/Day)
                    // If in profit by at least 15 points, tightly trail the stop behind by 10 points
                    // ---------------------------------------------------------------------------------
                    if (dep.engine_id === "aurum-momentum" && stillOpen) {
                        const currentPos = stillOpen.position;
                        // For gold, price typically moves in decimals. 15 points = 15.00
                        const trailTrigger = 15.0;
                        const trailDistance = 10.0;

                        const isBuy = trade.direction === "BUY";
                        const pointsInProfit = isBuy ? (latestPrice - openPrice) : (openPrice - latestPrice);

                        if (pointsInProfit >= trailTrigger) {
                            const newStopLevel = isBuy ? (latestPrice - trailDistance) : (latestPrice + trailDistance);

                            // Check if the new stop level is strictly better than the current one
                            const currentStop = currentPos.stopLevel;
                            const shouldUpdateStop = !currentStop ||
                                (isBuy && newStopLevel > currentStop) ||
                                (!isBuy && newStopLevel < currentStop);

                            if (shouldUpdateStop) {
                                try {
                                    console.log(`[Runner] Trailing Stop triggered for Momentum trade ${trade.deal_id}. New Stop: ${newStopLevel}`);
                                    await updatePosition(cst, xst, trade.deal_id, {
                                        stopLevel: parseFloat(newStopLevel.toFixed(2))
                                    }, dep.mode === 'demo', capSession.serverUrl);
                                } catch (e: any) {
                                    console.error(`[Runner] Failed to trail stop:`, e.message);
                                }
                            }
                        }
                    }

                    basketPnl += unrealized;

                }

                // 2. EXIT LOGIC - Dynamic Basket & Global Target
                const capital = parseFloat(dep.allocated_capital);
                const currentTotalPnl = parseFloat(dep.pnl || "0");
                const targetProfit = parseFloat(dep.target_profit || "999999");

                // --- Global Session Exit ---
                if ((currentTotalPnl + basketPnl) >= targetProfit) {
                    for (const t of openTrades) {
                        try { await closePosition(cst, xst, t.deal_id, dep.mode === 'demo', capSession.serverUrl); } catch { }
                    }
                    await withRetry(() => db.update(automationDeployments).set({ status: "Target Achieved", last_decision_reason: `Daily target of $${targetProfit} reached.` }).where(eq(automationDeployments.id, dep.id)));
                    continue;
                }

                // --- Dynamic Basket Exit (Keep Running, just reset positions) ---
                // For Gold Scalper: TP is ~0.6% ($3 per $500), SL is ~1.0% (-$5 per $500)
                // For others: TP is ~2.0% ($10), SL is ~3.0% (-$15)
                const isScalper = dep.engine_id === "aurum-velocity";
                const basketTP = isScalper ? (capital * 0.006) : (capital * 0.02);
                const basketSL = isScalper ? -(capital * 0.01) : -(capital * 0.03);

                if (openTrades.length > 0 && (basketPnl >= basketTP || basketPnl <= basketSL)) {
                    console.info(`[Runner] Basket exit triggered for ${dep.engine_id}. PNL: $${basketPnl.toFixed(2)}, Bounds: [${basketSL}, ${basketTP}]`);
                    let forcedClosePnl = 0;

                    for (const t of openTrades) {
                        try {
                            await closePosition(cst, xst, t.deal_id, dep.mode === 'demo', capSession.serverUrl);

                            const tradeUnrealized = t.direction === "BUY"
                                ? (latestPrice - parseFloat(t.open_price!)) * parseFloat(t.size)
                                : (parseFloat(t.open_price!) - latestPrice) * parseFloat(t.size);

                            forcedClosePnl += tradeUnrealized;

                            await withRetry(() => db.update(automationTrades).set({
                                status: "Closed",
                                pnl: tradeUnrealized.toString(),
                                close_price: latestPrice.toString()
                            }).where(eq(automationTrades.id, t.id)));
                        } catch (e: any) {
                            console.error(`[Runner] Failed to close basket trade ${t.deal_id}:`, e.message);
                        }
                    }

                    // Add cooldown after a basket flush to avoid instant reentry
                    const cooldown = new Date();
                    cooldown.setMinutes(cooldown.getMinutes() + 5);
                    await withRetry(() => db.update(automationDeployments).set({
                        cooldown_until: cooldown,
                        pnl: (currentTotalPnl + forcedClosePnl).toString(),
                        last_decision_reason: `Basket ${basketPnl >= basketTP ? 'Take Profit' : 'Stop Loss'} hit at $${basketPnl.toFixed(2)}. Cooling down.`
                    }).where(eq(automationDeployments.id, dep.id)));

                    continue;
                }

                // 3. ENTRY & LIVE PRICE
                const tickerRes = await getMarketTickers(cst, xst, [epic], dep.mode === 'demo', capSession.serverUrl);
                const marketInfo = tickerRes?.markets?.[0]?.snapshot;
                const currentBid = marketInfo?.bid || latestPrice;
                const currentOffer = marketInfo?.offer || latestPrice;
                const currentSpread = Math.abs(currentOffer - currentBid);

                const signal = engineClass.analyze(candles, currentSpread, dep.risk_level || 'Balanced');

                // Position Limiting Logic: 1 position per $500 allocated capital
                const maxPositions = Math.max(1, Math.floor(capital / 500));

                if (signal.direction !== "NEUTRAL" && openTrades.length < maxPositions) {
                    // ---------------------------------------------------------------------------------
                    // Maximum 3 Trades / Day Logic (Aurum Momentum Intraday S/R Strategy)
                    // Windows: Morning (00:00 - 08:00 UTC), Afternoon (08:00 - 16:00 UTC), Evening (16:00 - 24:00 UTC)
                    // ---------------------------------------------------------------------------------
                    if (dep.engine_id === "aurum-momentum") {
                        const now = new Date();
                        const hour = now.getUTCHours();

                        let windowStart = new Date(now);
                        let windowEnd = new Date(now);

                        if (hour < 8) { // 00:00 - 07:59
                            windowStart.setUTCHours(0, 0, 0, 0);
                            windowEnd.setUTCHours(7, 59, 59, 999);
                        } else if (hour < 16) { // 08:00 - 15:59
                            windowStart.setUTCHours(8, 0, 0, 0);
                            windowEnd.setUTCHours(15, 59, 59, 999);
                        } else { // 16:00 - 23:59
                            windowStart.setUTCHours(16, 0, 0, 0);
                            windowEnd.setUTCHours(23, 59, 59, 999);
                        }

                        // Check if we already traded in this window
                        const existingWindowTrades = await db.select().from(automationTrades)
                            .where(and(
                                eq(automationTrades.deployment_id, dep.id),
                                eq(automationTrades.user_id, userId),
                                gte(automationTrades.created_at, windowStart),
                                lt(automationTrades.created_at, windowEnd)
                            ));

                        if (existingWindowTrades.length > 0) {
                            await withRetry(() => db.update(automationDeployments).set({
                                last_decision_reason: `Trade budget exhausted for this window. Waiting for next session.`
                            }).where(eq(automationDeployments.id, dep.id)));
                            continue;
                        }
                    }

                    const riskPerTrade = capital * (signal.riskPercentage / 100);

                    // Dynamic Size Calculation based on Stop Loss distance
                    const entryPriceForSize = signal.direction === "BUY" ? currentBid : currentOffer;
                    const slDistance = Math.abs(entryPriceForSize - (signal.stopLoss || entryPriceForSize - 5));

                    let calculatedSize = slDistance > 0 ? riskPerTrade / slDistance : 0.1;
                    const size = Math.max(0.1, parseFloat(calculatedSize.toFixed(2)));

                    const orderRes = await placeOrder(cst, xst, epic, signal.direction, size, dep.mode === 'demo', {
                        takeProfit: signal.targetPrice,
                        stopLoss: signal.stopLoss
                    }, capSession.serverUrl);

                    if (orderRes && orderRes.dealReference) {
                        let dealId = orderRes.dealReference;
                        try {
                            await new Promise(res => setTimeout(res, 500));
                            const confirmRes = await getConfirm(cst, xst, orderRes.dealReference, dep.mode === 'demo', capSession.serverUrl);
                            if (confirmRes && confirmRes.dealId) {
                                dealId = confirmRes.dealId;
                            }
                        } catch (e) {
                            console.error("[Runner] Failed to get confirmation, using dealReference", e);
                        }

                        const entryPrice = signal.direction === "BUY" ? currentBid : currentOffer;
                        await withRetry(() => db.insert(automationTrades).values({
                            user_id: userId,
                            deployment_id: dep.id,
                            engine_id: dep.engine_id,
                            deal_id: dealId,
                            epic: epic,
                            direction: signal.direction,
                            size: size.toString(),
                            open_price: entryPrice.toString(),
                            pnl: "0",
                            mode: dep.mode || "demo",
                            status: "Open"
                        }));
                    }
                } else {
                    await withRetry(() => db.update(automationDeployments).set({ last_decision_reason: signal.reasoning }).where(eq(automationDeployments.id, dep.id)));
                }
            } catch (innerError: any) {
                console.error(`[RunnerAPI Engine Error for ${dep.engine_id}]:`, innerError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("[RunnerAPI Error]:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
