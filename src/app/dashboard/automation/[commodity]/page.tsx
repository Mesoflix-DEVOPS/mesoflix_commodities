"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Cpu, Activity, ShieldAlert, BarChart3, Settings2, Play, Pause, Square, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutomation, EngineState, EngineDetails } from "@/contexts/AutomationContext";
import { useMarketData } from "@/contexts/MarketDataContext";
import DeployModal from "./DeployModal";

// Data Structure defined by PRD
const MARKET_DATA: Record<string, any> = {
    "gold": {
        epic: "GOLD",
        name: "Gold", symbol: "XAU", defaultPrice: "$2,642.80", range: "$2,610 - $2,655", status: "Open", vol: "High",
        desc: "The premier safe-haven asset. Gold algorithms explicitly target macro-volatility events and inflation hedging flows.",
        color: "text-amber-400", bg: "from-amber-400/20", borderColor: "border-amber-400/30",
        engines: [
            { id: "aurum-velocity", name: "Aurum Velocity", tag: "High-Frequency Scalper", type: "Scalper", risk: "High", trades: 45, hold: "15m", recCap: 5000, minCap: 500, winRate: 68.4, return30: 12.4, dd: 8.2, sharpe: 2.1 },
            { id: "aurum-momentum", name: "Aurum Momentum", tag: "Trend Continuation", type: "Intraday", risk: "Medium", trades: 8, hold: "4h", recCap: 10000, minCap: 1000, winRate: 55.2, return30: 18.7, dd: 12.4, sharpe: 1.8 },
            { id: "aurum-apex", name: "Aurum Apex", tag: "Macro Positioning", type: "Position", risk: "Low", trades: 2, hold: "3d", recCap: 25000, minCap: 5000, winRate: 42.1, return30: 8.5, dd: 4.1, sharpe: 2.4 }
        ]
    },
    "crude-oil": {
        epic: "OIL_CRUDE",
        name: "Crude Oil", symbol: "WTI", defaultPrice: "$78.41", range: "$76.20 - $79.10", status: "Open", vol: "Medium",
        desc: "Highly reactive to geopolitical news. Oil engines are designed to capture inventory sweeps and supply-side shocks.",
        color: "text-blue-500", bg: "from-blue-500/20", borderColor: "border-blue-500/30",
        engines: [
            { id: "crude-pulse", name: "Crude Pulse", tag: "Inventory Scalper", type: "Scalper", risk: "High", trades: 30, hold: "30m", recCap: 5000, minCap: 500, winRate: 62.1, return30: 15.2, dd: 10.5, sharpe: 1.9 },
            { id: "crude-momentum", name: "Crude Momentum", tag: "Session Breakout", type: "Intraday", risk: "Medium", trades: 5, hold: "6h", recCap: 10000, minCap: 1000, winRate: 58.4, return30: 22.1, dd: 14.2, sharpe: 1.7 },
            { id: "crude-dominion", name: "Crude Dominion", tag: "Structural Swings", type: "Position", risk: "Low", trades: 1, hold: "5d", recCap: 20000, minCap: 2000, winRate: 45.8, return30: 11.4, dd: 6.8, sharpe: 2.2 }
        ]
    },
    "eur-usd": {
        epic: "EURUSD",
        name: "EUR/USD", symbol: "EUR/USD", defaultPrice: "1.0842", range: "1.0810 - 1.0890", status: "Open", vol: "Low",
        desc: "The most liquid forex pair. EUR/USD systems focus on central bank divergence and tight-spread mean reversion.",
        color: "text-blue-400", bg: "from-blue-400/20", borderColor: "border-blue-400/30",
        engines: [
            { id: "euro-flux", name: "Euro Flux", tag: "Mean Reversion", type: "Scalper", risk: "Medium", trades: 50, hold: "10m", recCap: 3000, minCap: 250, winRate: 72.5, return30: 9.8, dd: 5.4, sharpe: 2.6 },
            { id: "euro-vector", name: "Euro Vector", type: "Intraday", tag: "London Session Moves", risk: "Medium", trades: 12, hold: "2h", recCap: 5000, minCap: 500, winRate: 60.2, return30: 14.5, dd: 7.2, sharpe: 2.0 },
            { id: "euro-macro", name: "Euro Macro", type: "Position", tag: "Intervention Tracking", risk: "Low", trades: 3, hold: "2d", recCap: 15000, minCap: 1500, winRate: 48.9, return30: 7.2, dd: 3.5, sharpe: 2.8 }
        ]
    },
    "bitcoin": {
        epic: "BTCUSD",
        name: "Bitcoin", symbol: "BTC", defaultPrice: "$64,210", range: "$61,000 - $65,500", status: "Open 24/7", vol: "Extreme",
        desc: "High velocity, high risk. Crypto engines utilize extreme volatility parameters to capture violent liquidity zones.",
        color: "text-orange-500", bg: "from-orange-500/20", borderColor: "border-orange-500/30",
        engines: [
            { id: "crypto-pulse", name: "Crypto Pulse", tag: "Liquidity Sweeper", type: "Scalper", risk: "Extreme", trades: 120, hold: "5m", recCap: 2000, minCap: 100, winRate: 54.2, return30: 38.5, dd: 22.4, sharpe: 1.4 },
            { id: "crypto-trend", name: "Crypto Trend", tag: "Momentum Rider", type: "Intraday", risk: "High", trades: 15, hold: "8h", recCap: 5000, minCap: 500, winRate: 48.7, return30: 45.2, dd: 28.5, sharpe: 1.2 },
            { id: "crypto-titan", name: "Crypto Titan", tag: "Cycle Accumulation", type: "Position", risk: "Medium", trades: 4, hold: "1w", recCap: 10000, minCap: 1000, winRate: 41.5, return30: 25.4, dd: 18.2, sharpe: 1.6 }
        ]
    }
};


export default function CommodityAutomationPage({ params }: { params: Promise<{ commodity: string }> }) {
    const resolvedParams = use(params);
    const commId = resolvedParams.commodity;
    const market = MARKET_DATA[commId];
    const { engines, deployEngine, updateEngineState } = useAutomation();
    const { marketData } = useMarketData();
    const live = marketData[market?.epic];

    const [deployModalOpen, setDeployModalOpen] = useState(false);
    const [selectedEngine, setSelectedEngine] = useState<any>(null);
    const [flash, setFlash] = useState<"up" | "down" | null>(null);
    const prevPrice = useRef<number | null>(null);

    const price = live?.bid ?? 0;
    const changePct = live?.changePct ?? 0;

    useEffect(() => {
        if (price && prevPrice.current !== null && price !== prevPrice.current) {
            setFlash(price > prevPrice.current ? "up" : "down");
            const timer = setTimeout(() => setFlash(null), 800);
            return () => clearTimeout(timer);
        }
        if (price) prevPrice.current = price;
    }, [price]);

    if (!market) {
        return <div className="p-12 text-center text-gray-500">Market not found.</div>;
    }

    const openDeploy = (engine: any) => {
        setSelectedEngine(engine);
        setDeployModalOpen(true);
    };

    const handleConfirmDeploy = (capital: number, stopLoss: number, multiplier: number) => {
        deployEngine({
            id: selectedEngine.id,
            name: selectedEngine.name,
            commodity: commId,
            state: "Running",
            allocatedCapital: capital,
            stopLossCap: stopLoss,
            riskMultiplier: multiplier,
            targetProfit: 100, // Default target
            dailyStopLoss: stopLoss, // Use stoploss for daily cap too
            riskLevel: "Balanced", // Default level
            pnl: 0
        });
        setDeployModalOpen(false);
    };

    const displayPrice = price > 0
        ? (market.epic.includes("USD") && !market.epic.includes("BTC") ? price.toFixed(4) : `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        : market.defaultPrice;

    const displayChange = price > 0
        ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
        : null;

    const isPositive = price > 0 ? changePct >= 0 : true;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div>
                <Link href="/dashboard/automation" className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-6">
                    <ArrowLeft size={14} className="mr-2" /> Back to Markets
                </Link>
                <div className={cn(
                    "bg-[#0A1622] rounded-3xl p-8 border relative overflow-hidden transition-all duration-500",
                    market.borderColor,
                    flash === "up" ? "bg-teal/5 border-teal/40" : flash === "down" ? "bg-red-500/5 border-red-500/40" : ""
                )}>
                    <div className={cn("absolute top-0 right-0 w-96 h-96 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 opacity-50", market.bg)} />

                    {/* Price Flash Overlay */}
                    <div className={cn(
                        "absolute inset-0 transition-opacity duration-500 pointer-events-none",
                        flash === "up" ? "bg-teal/10 opacity-100" : flash === "down" ? "bg-red-500/10 opacity-100" : "opacity-0"
                    )} />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-black text-white">{market.name}</h1>
                                <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-white/5 border border-white/10", market.color)}>
                                    {market.symbol}
                                </span>
                            </div>
                            <p className="text-gray-400 max-w-xl text-sm leading-relaxed">{market.desc}</p>
                        </div>

                        <div className="flex gap-6 text-right">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Live Price</p>
                                <p className={cn(
                                    "text-2xl font-mono font-bold transition-colors duration-300",
                                    flash === "up" ? "text-teal" : flash === "down" ? "text-red-400" : "text-white"
                                )}>
                                    {displayPrice}
                                </p>
                                {displayChange && (
                                    <div className={cn(
                                        "font-bold text-xs flex items-center justify-end gap-1 mt-1",
                                        isPositive ? "text-teal" : "text-red-500"
                                    )}>
                                        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                        {displayChange}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Daily Range</p>
                                <p className="text-lg font-mono font-bold text-gray-300">{market.range}</p>
                            </div>
                            <div className="hidden lg:block">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Status</p>
                                <div className="flex items-center justify-end gap-2">
                                    <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                                    <p className="text-sm font-bold text-teal uppercase tracking-widest">{market.status}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Engines */}
            <div>
                <div className="flex items-center gap-3 mb-6 px-2">
                    <Cpu className="text-teal" size={20} />
                    <h2 className="text-xl font-bold text-white tracking-tight">Available AI Engines</h2>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {market.engines.map((eng: any) => {
                        const deployment = engines[eng.id];
                        const isDeployed = !!deployment;
                        const isRunning = deployment?.state === "Running";

                        return (
                            <div key={eng.id} className="bg-[#0A1622] rounded-3xl border border-white/5 overflow-hidden flex flex-col h-full relative group hover:border-white/10 transition-colors">
                                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-black text-white">{eng.name}</h3>
                                        <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                            {eng.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-teal font-bold tracking-wide">{eng.tag}</p>
                                </div>

                                <div className="p-6 space-y-6 flex-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Risk Profile</p>
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert size={14} className={
                                                    eng.risk === 'Low' ? 'text-teal' :
                                                        eng.risk === 'Medium' ? 'text-amber-500' :
                                                            'text-red-500'
                                                } />
                                                <span className="text-sm font-bold text-white">{eng.risk}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Avg Trade Hold</p>
                                            <span className="text-sm font-bold text-white">{eng.hold}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Rec. Capital</p>
                                            <span className="text-sm font-bold text-white">${eng.recCap.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Trades / Day</p>
                                            <span className="text-sm font-bold text-white">{eng.trades}</span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-[#0E1B2A] rounded-2xl border border-white/5">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <BarChart3 size={12} /> Live Performance Snapshot
                                        </p>
                                        <div className="grid grid-cols-2 gap-y-3">
                                            <div>
                                                <span className="text-xs text-gray-400 block">Win Rate</span>
                                                <span className="text-white font-bold">{eng.winRate}%</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 block">30D Return</span>
                                                <span className="text-teal font-bold">+{eng.return30}%</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 block">Max DD</span>
                                                <span className="text-red-400 font-bold">-{eng.dd}%</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 block">Sharpe</span>
                                                <span className="text-white font-bold">{eng.sharpe}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-white/5 bg-black/20">
                                    {!isDeployed ? (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => openDeploy(eng)}
                                                className="flex-1 bg-teal text-black font-black py-3 rounded-xl hover:bg-[#00e6c7] transition-colors"
                                            >
                                                Deploy Engine
                                            </button>
                                            <Link
                                                href={`/dashboard/automation/${commId}/${eng.id}`}
                                                className="px-4 bg-white/5 text-white font-bold rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10"
                                            >
                                                Analytics
                                            </Link>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full", isRunning ? "bg-teal animate-pulse" : "bg-amber-500")} />
                                                    <span className="text-xs font-bold uppercase tracking-widest text-white">{deployment.state}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block">Allocated</span>
                                                    <span className="text-sm font-bold text-white font-mono">${deployment.allocatedCapital.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {isRunning ? (
                                                    <button
                                                        onClick={() => updateEngineState(eng.id, "Paused")}
                                                        className="flex-1 bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold py-2 rounded-xl flex justify-center items-center gap-2 hover:bg-amber-500/30 transition-colors"
                                                    >
                                                        <Pause size={16} /> Pause
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => updateEngineState(eng.id, "Running")}
                                                        className="flex-1 bg-teal/20 text-teal border border-teal/30 font-bold py-2 rounded-xl flex justify-center items-center gap-2 hover:bg-teal/30 transition-colors"
                                                    >
                                                        <Play size={16} /> Resume
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => updateEngineState(eng.id, "Stopped")}
                                                    className="w-12 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl flex justify-center items-center hover:bg-red-500/20 transition-colors"
                                                    title="Force Stop Engine"
                                                >
                                                    <Square size={14} />
                                                </button>
                                                <Link
                                                    href={`/dashboard/automation/${commId}/${eng.id}`}
                                                    className="w-12 bg-white/5 text-white border border-white/10 rounded-xl flex justify-center items-center hover:bg-white/10 transition-colors"
                                                >
                                                    <Settings2 size={16} />
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <DeployModal
                isOpen={deployModalOpen}
                onClose={() => setDeployModalOpen(false)}
                engine={selectedEngine}
                onConfirm={handleConfirmDeploy}
            />
        </div>
    );
}
