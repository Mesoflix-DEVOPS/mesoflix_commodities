"use client";

import { useState, useEffect, useCallback } from "react";
import {
    ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
    Zap, BarChart3, Activity, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketData } from "@/contexts/MarketDataContext";

const POLL_MS = 30_000; // sentiment refreshes every 30s

interface SentimentItem {
    epic: string;
    label: string;
    longPct: number;
    shortPct: number;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export default function RightPanel() {
    const [isOpen, setIsOpen] = useState(true);
    const { marketData, mode } = useMarketData();
    const [sentiments, setSentiments] = useState<SentimentItem[]>([]);
    const [sentimentLoading, setSentimentLoading] = useState(true);
    const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});

    // ── Build rolling price history for sparklines ────────────────────────
    useEffect(() => {
        setPriceHistory(prev => {
            const next = { ...prev };
            Object.keys(marketData).forEach(epic => {
                const bid = marketData[epic]?.bid;
                if (bid) next[epic] = [...(next[epic] || []), bid].slice(-10);
            });
            return next;
        });
    }, [marketData]);

    // ── Fetch live sentiment from Capital.com ─────────────────────────────
    const fetchSentiment = useCallback(async () => {
        try {
            const res = await fetch(`/api/sentiment?mode=${mode}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.sentiments?.length > 0) {
                setSentiments(data.sentiments);
                setSentimentLoading(false);
            }
        } catch {
            // Keep last data on error
        }
    }, [mode]);

    useEffect(() => {
        fetchSentiment();
        const t = setInterval(fetchSentiment, POLL_MS);
        return () => clearInterval(t);
    }, [fetchSentiment]);

    // ── Price getter ──────────────────────────────────────────────────────
    const getPriceData = (epic: string) => {
        const item = marketData[epic];
        if (!item) return { price: '--.--', change: '----', isUp: true };
        return {
            price: typeof item.bid === 'number'
                ? item.bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })
                : '--.--',
            change: typeof item.changePct === 'number'
                ? `${item.changePct > 0 ? '+' : ''}${item.changePct.toFixed(2)}%`
                : '0.00%',
            isUp: (item.changePct ?? item.change ?? 0) >= 0,
        };
    };

    return (
        <aside className={cn(
            "fixed right-0 top-[70px] h-[calc(100vh-70px)] bg-[#0A1622] border-l border-white/5 transition-all duration-500 z-40 hidden xl:flex flex-col",
            isOpen ? "w-80" : "w-12"
        )}>
            {/* Collapse toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute -left-3 top-8 w-6 h-6 bg-teal rounded-full flex items-center justify-center text-dark-blue shadow-lg border border-white/10 z-50 hover:scale-110 transition-transform"
            >
                {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Collapsed state */}
            {!isOpen ? (
                <div className="flex-1 flex flex-col items-center py-8 gap-8 overflow-hidden">
                    <div className="text-teal p-1 rotate-90 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.3em] origin-center translate-y-20">
                        Market Intelligence
                    </div>
                    <div className="mt-auto space-y-6">
                        <Zap size={18} className="text-gray-700 hover:text-teal transition-colors cursor-pointer" />
                        <BarChart3 size={18} className="text-gray-700 hover:text-teal transition-colors cursor-pointer" />
                        <Activity size={18} className="text-gray-700 hover:text-teal transition-colors cursor-pointer" />
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-8 scrollbar-hide animate-in slide-in-from-right-4 duration-500">

                    {/* ── Section A: Live Tickers ─────────────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Live Intelligence</h3>
                            <span className="text-[8px] text-teal font-black uppercase tracking-widest bg-teal/5 px-2 py-0.5 rounded border border-teal/10 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-teal animate-pulse" />
                                Live
                            </span>
                        </div>
                        <div className="space-y-3">
                            <TickerRow symbol="GOLD"    {...getPriceData("GOLD")} />
                            <TickerRow symbol="OIL"     {...getPriceData("OIL_CRUDE")} />
                            <TickerRow symbol="EUR/USD" {...getPriceData("EURUSD")} />
                            <TickerRow symbol="BTC/USD" {...getPriceData("BTCUSD")} />
                        </div>
                    </div>

                    {/* ── Section B: Market Sentiment (live from Capital.com) ──── */}
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <Users size={12} /> Market Sentiment
                            </h3>
                            <span className="text-[8px] text-amber-400 font-black uppercase tracking-widest bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/10">
                                Capital.com
                            </span>
                        </div>

                        {sentimentLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sentiments.map(s => (
                                    <SentimentRow key={s.epic} {...s} />
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </aside>
    );
}

// ── Ticker row with price and change badge ─────────────────────────────────
function TickerRow({ symbol, price, change, isUp }: {
    symbol: string; price: string; change: string; isUp: boolean;
}) {
    return (
        <div className="flex items-center justify-between group cursor-default p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
            <div>
                <p className="text-xs font-black text-white tracking-tight group-hover:text-teal transition-colors">{symbol}</p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{price}</p>
            </div>
            <div className={cn(
                "text-[9px] font-black px-2 py-1 rounded-lg border",
                isUp
                    ? "text-teal bg-teal/10 border-teal/20"
                    : "text-red-400 bg-red-500/10 border-red-500/20"
            )}>
                {isUp ? <TrendingUp size={10} className="inline mr-0.5" /> : <TrendingDown size={10} className="inline mr-0.5" />}
                {change}
            </div>
        </div>
    );
}

// ── Sentiment bar — shows bullish vs bearish split ─────────────────────────
function SentimentRow({ label, longPct, shortPct, bias }: SentimentItem) {
    return (
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-white tracking-tight">{label}</span>
                <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                    bias === 'BULLISH' ? 'text-teal bg-teal/10' :
                        bias === 'BEARISH' ? 'text-red-400 bg-red-500/10' :
                            'text-gray-500 bg-white/5'
                )}>
                    {bias}
                </span>
            </div>
            {/* Dual progress bar: green = long, red = short */}
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                <div
                    className="h-full bg-teal rounded-l-full transition-all duration-700"
                    style={{ width: `${longPct}%` }}
                />
                <div
                    className="h-full bg-red-500 rounded-r-full transition-all duration-700"
                    style={{ width: `${shortPct}%` }}
                />
            </div>
            <div className="flex justify-between mt-1.5">
                <span className="text-[8px] font-black text-teal">{longPct}% Long</span>
                <span className="text-[8px] font-black text-red-400">{shortPct}% Short</span>
            </div>
        </div>
    );
}
