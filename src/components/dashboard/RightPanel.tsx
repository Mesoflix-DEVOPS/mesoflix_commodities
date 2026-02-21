"use client";

import { useState, useEffect } from "react";
import {
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Zap,
    Target,
    BarChart3,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function RightPanel() {
    const [isOpen, setIsOpen] = useState(true);
    const [marketData, setMarketData] = useState<any>(null);

    const fetchMarkets = async () => {
        try {
            const res = await fetch('/api/markets');
            if (res.ok) {
                const data = await res.json();
                setMarketData(data);
            }
        } catch (err) {
            console.error('Failed to fetch markets:', err);
        }
    };

    useEffect(() => {
        fetchMarkets();
        const interval = setInterval(fetchMarkets, 15000);
        return () => clearInterval(interval);
    }, []);

    const getPriceData = (symbol: string) => {
        const item = marketData?.marketdetails?.find((m: any) => m.instrumentName.includes(symbol.split('/')[0]));
        if (!item) return { price: '--.--', change: '0.00%', isUp: true };

        const change = ((item.snapshot.bid - item.snapshot.decimalPlacesFactor) / 100).toFixed(2); // Mock change calculation
        return {
            price: item.snapshot.bid.toLocaleString(),
            change: item.snapshot.netChange > 0 ? `+${item.snapshot.netChange}%` : `${item.snapshot.netChange}%`,
            isUp: item.snapshot.netChange >= 0
        };
    };

    return (
        <aside
            className={cn(
                "fixed right-0 top-[70px] h-[calc(100vh-70px)] bg-[#0A1622] border-l border-white/5 transition-all duration-500 z-40 hidden xl:flex flex-col",
                isOpen ? "w-80" : "w-12"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute -left-3 top-8 w-6 h-6 bg-teal rounded-full flex items-center justify-center text-dark-blue shadow-lg border border-white/10 z-50 hover:scale-110 transition-transform"
            >
                {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {!isOpen ? (
                <div className="flex-1 flex flex-col items-center py-8 gap-8 overflow-hidden">
                    <div className="text-teal p-1 rotate-90 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.3em] origin-center translate-y-20">Market Intelligence</div>
                    <div className="mt-auto space-y-6">
                        <Zap size={18} className="text-gray-700 hover:text-teal transition-colors cursor-pointer" />
                        <BarChart3 size={18} className="text-gray-700 hover:text-teal transition-colors cursor-pointer" />
                        <Target size={18} className="text-gray-700 hover:text-teal transition-colors cursor-pointer" />
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-10 scrollbar-hide animate-in slide-in-from-right-4 duration-500">
                    {/* Market Tickers */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Live Intelligence</h3>
                            <span className="text-[8px] text-teal font-black uppercase tracking-widest bg-teal/5 px-2 py-0.5 rounded border border-teal/10">Streaming</span>
                        </div>
                        <div className="space-y-4">
                            <TickerItem symbol="GOLD" {...getPriceData("GOLD")} />
                            <TickerItem symbol="OIL" {...getPriceData("OIL")} />
                            <TickerItem symbol="EUR/USD" {...getPriceData("EUR/USD")} />
                            <TickerItem symbol="BTC/USD" {...getPriceData("BTC/USD")} />
                        </div>
                    </div>

                    {/* Quick Execution Portal */}
                    <div className="bg-black/20 rounded-3xl border border-white/5 p-6 space-y-6">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Zap size={14} className="text-teal" />
                            Flash Execution
                        </h4>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest px-1">Asset Class</label>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs font-bold text-gray-300 flex justify-between items-center cursor-pointer hover:border-white/10 transition-all">
                                    Gold Spot
                                    <ChevronRight size={12} className="text-gray-600" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button className="py-3 bg-green-500/10 text-green-500 rounded-xl border border-green-500/10 text-[10px] font-black uppercase hover:bg-green-500 hover:text-dark-blue transition-all">BUY</button>
                                <button className="py-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/10 text-[10px] font-black uppercase hover:bg-red-500 hover:text-dark-blue transition-all">SELL</button>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Events */}
                    <div>
                        <h3 className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Clock size={12} /> Economic Radar
                        </h3>
                        <div className="space-y-6">
                            <EventItem time="14:30" title="Core CPI (YoY)" volatility="High" />
                            <EventItem time="16:00" title="EIA Crude Inventories" volatility="Med" />
                            <EventItem time="19:00" title="FOMC Statement" volatility="Extreme" />
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}

function TickerItem({ symbol, price, change, isUp }: any) {
    return (
        <div className="flex items-center justify-between group cursor-pointer p-2 -m-2 rounded-xl hover:bg-white/5 transition-all">
            <div>
                <p className="text-xs font-black text-white group-hover:text-teal transition-colors tracking-tighter">{symbol}</p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{price}</p>
            </div>
            <div className={cn("text-[9px] font-black px-2 py-1 rounded bg-black/20 border transition-all",
                isUp ? "text-green-500 border-green-500/10" : "text-red-500 border-red-500/10"
            )}>
                {change}
            </div>
        </div>
    );
}

function EventItem({ time, title, volatility }: any) {
    return (
        <div className="flex gap-4">
            <span className="text-[10px] font-mono text-gray-600 whitespace-nowrap">{time}</span>
            <div className="space-y-1">
                <p className="text-[11px] font-bold text-gray-300 leading-tight">{title}</p>
                <div className={cn("inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded",
                    volatility === 'High' ? 'bg-amber-500/10 text-amber-500' :
                        volatility === 'Extreme' ? 'bg-red-500/10 text-red-500' :
                            'bg-teal/10 text-teal'
                )}>{volatility} Risk</div>
            </div>
        </div>
    );
}
