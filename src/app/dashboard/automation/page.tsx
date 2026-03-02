"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Cpu, TrendingUp, Activity, BarChart2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketData } from "@/contexts/MarketDataContext";

const MARKETS = [
    {
        id: "gold",
        epic: "GOLD",
        name: "Gold",
        symbol: "XAU",
        defaultPrice: "$2,642.80",
        defaultChange: "+0.84%",
        volatility: "High",
        engines: 3,
        color: "text-amber-400",
        bg: "from-amber-400/20 to-transparent",
        border: "border-amber-400/20 hover:border-amber-400/50",
    },
    {
        id: "crude-oil",
        epic: "OIL_CRUDE",
        name: "Crude Oil",
        symbol: "WTI",
        defaultPrice: "$78.41",
        defaultChange: "+1.20%",
        volatility: "Medium",
        engines: 3,
        color: "text-blue-500",
        bg: "from-blue-500/20 to-transparent",
        border: "border-blue-500/20 hover:border-blue-500/50",
    },
    {
        id: "eur-usd",
        epic: "EURUSD",
        name: "EUR/USD",
        symbol: "EUR/USD",
        defaultPrice: "1.0842",
        defaultChange: "-0.15%",
        volatility: "Low",
        engines: 3,
        color: "text-blue-400",
        bg: "from-blue-400/20 to-transparent",
        border: "border-blue-400/20 hover:border-blue-400/50",
    },
    {
        id: "bitcoin",
        epic: "BTCUSD",
        name: "Bitcoin",
        symbol: "BTC",
        defaultPrice: "$64,210",
        defaultChange: "+4.50%",
        volatility: "Extreme",
        engines: 3,
        color: "text-orange-500",
        bg: "from-orange-500/20 to-transparent",
        border: "border-orange-500/20 hover:border-orange-500/50",
    }
];

function PriceCard({ market }: { market: typeof MARKETS[0] }) {
    const { marketData } = useMarketData();
    const live = marketData[market.epic];
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

    const displayPrice = price > 0
        ? (market.epic.includes("USD") && !market.epic.includes("BTC") ? price.toFixed(4) : `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        : market.defaultPrice;

    const displayChange = price > 0
        ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
        : market.defaultChange;

    const isPositive = price > 0 ? changePct >= 0 : !market.defaultChange.startsWith('-');

    return (
        <div className={cn(
            "group relative bg-[#0A1622] rounded-3xl p-6 border transition-all duration-500 overflow-hidden",
            market.border,
            flash === "up" ? "border-teal/40 bg-teal/5" : flash === "down" ? "border-red-500/40 bg-red-500/5" : ""
        )}>
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", market.bg)} />

            {/* Price Flash Overlay */}
            <div className={cn(
                "absolute inset-0 transition-opacity duration-500 pointer-events-none",
                flash === "up" ? "bg-teal/10 opacity-100" : flash === "down" ? "bg-red-500/10 opacity-100" : "opacity-0"
            )} />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white">{market.name}</h2>
                        <span className={cn("text-xs font-bold uppercase tracking-widest", market.color)}>{market.symbol}</span>
                    </div>
                    <div className="text-right">
                        <div className={cn(
                            "text-xl font-mono font-bold transition-colors duration-300",
                            flash === "up" ? "text-teal" : flash === "down" ? "text-red-400" : "text-white"
                        )}>
                            {displayPrice}
                        </div>
                        <div className={cn(
                            "font-bold text-sm flex items-center justify-end gap-1",
                            isPositive ? "text-teal" : "text-red-500"
                        )}>
                            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {displayChange}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#0E1B2A] rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Activity size={14} />
                            <span className="text-[10px] uppercase tracking-widest font-bold">Volatility</span>
                        </div>
                        <div className="text-white font-bold">{market.volatility}</div>
                    </div>
                    <div className="bg-[#0E1B2A] rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Cpu size={14} />
                            <span className="text-[10px] uppercase tracking-widest font-bold">AI Models</span>
                        </div>
                        <div className="text-white font-bold">{market.engines} Engines Available</div>
                    </div>
                </div>

                <div className="mt-auto">
                    <Link
                        href={`/dashboard/automation/${market.id}`}
                        className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all group-hover:bg-teal group-hover:text-black border border-white/10 group-hover:border-teal/50"
                    >
                        <span>Enter {market.name} Systems</span>
                        <BarChart2 size={18} />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function AutomationLandingPage() {
    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="bg-[#0A1622] rounded-3xl p-8 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pattern-grid-lg text-white/[0.02]" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-teal/10 border border-teal/20 flex items-center justify-center">
                            <Cpu className="text-teal w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Mesoflix <span className="text-teal">Automation</span></h1>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Institutional AI Trading Infrastructure</p>
                        </div>
                    </div>
                    <p className="text-gray-400 max-w-2xl leading-relaxed">
                        Deploy intelligent trading engines engineered specifically for distinct market personalities. Browse the algorithmic marketplace, allocate capital, and let our proprietary AI models execute high-probability institutional setups.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {MARKETS.map((market) => (
                    <PriceCard key={market.id} market={market} />
                ))}
            </div>
        </div>
    );
}
