"use client";

import { useState, useEffect, useCallback } from "react";
import {
    ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
    Zap, BarChart3, Activity, Users, X, RefreshCw,
    ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketData } from "@/contexts/MarketDataContext";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/fetch-utils";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from "recharts";

const POLL_MS = 30_000;

type Bias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

interface SentimentItem {
    epic: string;
    label: string;
    longPct: number;
    shortPct: number;
    bias: Bias;
}

interface ChartPoint { time: string; open: number; high: number; low: number; close: number; }
interface Snapshot {
    bid: number; offer: number; high: number; low: number;
    netChange: number; percentageChange: number; status: string; currency: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Modal
// ─────────────────────────────────────────────────────────────────────────────
function DetailModal({
    item, onClose, mode
}: { item: SentimentItem | null; onClose: () => void; mode: string }) {
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolution, setResolution] = useState<'MINUTE_5' | 'MINUTE_30' | 'HOUR' | 'DAY'>('HOUR');
    const router = useRouter();

    const fetchChart = useCallback(async () => {
        if (!item) return;
        setLoading(true);
        try {
            const res = await authedFetch(`/api/chart/${item.epic}?mode=${mode}&resolution=${resolution}&max=50`, router);
            if (res && res.ok) {
                const data = await res.json();
                setChartData(data.chartData || []);
                setSnapshot(data.snapshot);
            }
        } catch { /* keep last */ }
        finally { setLoading(false); }
    }, [item, mode, resolution, router]);

    useEffect(() => {
        fetchChart();
    }, [fetchChart]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!item) return null;

    const isUp = (snapshot?.percentageChange ?? item.longPct - 50) >= 0;
    const spread = snapshot ? (snapshot.offer - snapshot.bid).toFixed(4) : '—';

    const RESOLUTIONS = [
        { key: 'MINUTE_5', label: '5M' },
        { key: 'MINUTE_30', label: '30M' },
        { key: 'HOUR', label: '1H' },
        { key: 'DAY', label: '1D' },
    ] as const;

    return (
        // Backdrop — no blur, just dark overlay so content is sharp
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70"
            onClick={onClose}
        >
            <div
                className="relative w-[700px] max-w-[96vw] max-h-[90vh] overflow-y-auto bg-[#0D1B2A] border border-white/10 rounded-[2rem] shadow-2xl animate-in fade-in zoom-in-95 duration-300 p-8"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">{item.label}</h2>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">
                            {item.epic} · Capital.com Live
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {snapshot && (
                            <div className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-black",
                                isUp ? "bg-teal/10 text-teal border border-teal/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                            )}>
                                {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {snapshot.percentageChange > 0 ? '+' : ''}{snapshot.percentageChange.toFixed(2)}%
                            </div>
                        )}
                        <button
                            onClick={fetchChart}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/5 transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Price strip */}
                {snapshot && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        {[
                            { label: 'Bid', value: snapshot.bid.toLocaleString(undefined, { minimumFractionDigits: 2 }), color: 'text-teal' },
                            { label: 'Offer', value: snapshot.offer.toLocaleString(undefined, { minimumFractionDigits: 2 }), color: 'text-red-400' },
                            { label: 'Daily High', value: snapshot.high.toLocaleString(undefined, { minimumFractionDigits: 2 }), color: 'text-white' },
                            { label: 'Daily Low', value: snapshot.low.toLocaleString(undefined, { minimumFractionDigits: 2 }), color: 'text-white' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">{label}</p>
                                <p className={cn("text-base font-black font-mono", color)}>{value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Resolution selector */}
                <div className="flex items-center gap-2 mb-4">
                    {RESOLUTIONS.map(r => (
                        <button
                            key={r.key}
                            onClick={() => setResolution(r.key)}
                            className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                resolution === r.key
                                    ? "bg-teal text-dark-blue"
                                    : "bg-white/5 text-gray-500 hover:text-white border border-white/10"
                            )}
                        >
                            {r.label}
                        </button>
                    ))}
                    <span className="ml-auto text-[9px] text-gray-600 font-black uppercase tracking-widest">
                        Spread: {spread}
                    </span>
                </div>

                {/* Price chart */}
                <div className="relative w-full aspect-[2/1] min-h-[220px] mb-6 bg-black/20 rounded-2xl p-4 overflow-hidden">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-teal/20 border-t-teal rounded-full animate-spin" />
                        </div>
                    ) : chartData.length > 0 ? (
                        <ResponsiveContainer width="99%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={isUp ? "#00BFA6" : "#ef4444"} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={isUp ? "#00BFA6" : "#ef4444"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 'bold' }}
                                    axisLine={false} tickLine={false}
                                    interval={Math.floor(chartData.length / 6)}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 'bold' }}
                                    axisLine={false} tickLine={false}
                                    width={60}
                                    tickFormatter={(v) => v.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#0A1622', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '11px' }}
                                    labelStyle={{ color: '#9ca3af', marginBottom: '4px', fontWeight: 'bold' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="close"
                                    stroke={isUp ? "#00BFA6" : "#ef4444"}
                                    strokeWidth={2}
                                    fill="url(#chartGrad)"
                                    dot={false}
                                    isAnimationActive={true}
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-600 text-[10px] font-black uppercase tracking-widest">
                            Chart data unavailable for this instrument
                        </div>
                    )}
                </div>

                {/* Sentiment breakdown */}
                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Users size={12} /> Market Sentiment — Capital.com Clients
                    </h4>

                    <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-teal">{item.longPct}% Long</span>
                        <span className={cn(
                            "px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            item.bias === 'BULLISH' ? 'bg-teal/10 text-teal' :
                                item.bias === 'BEARISH' ? 'bg-red-500/10 text-red-400' :
                                    'bg-white/5 text-gray-500'
                        )}>{item.bias}</span>
                        <span className="text-red-400">{item.shortPct}% Short</span>
                    </div>

                    <div className="h-3 rounded-full bg-white/5 overflow-hidden flex">
                        <div className="h-full bg-gradient-to-r from-teal to-teal/60 transition-all duration-700 rounded-l-full"
                            style={{ width: `${item.longPct}%` }} />
                        <div className="h-full bg-gradient-to-l from-red-500 to-red-500/60 transition-all duration-700 rounded-r-full"
                            style={{ width: `${item.shortPct}%` }} />
                    </div>

                    <p className="text-[9px] text-gray-600 mt-3 font-black uppercase tracking-widest text-center">
                        Data sourced from Capital.com client positions · Updated every 30s
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// RightPanel
// ─────────────────────────────────────────────────────────────────────────────
export default function RightPanel() {
    const [isOpen, setIsOpen] = useState(true);
    const { marketData, mode } = useMarketData();
    const [sentiments, setSentiments] = useState<SentimentItem[]>([]);
    const [sentimentLoading, setSentimentLoading] = useState(true);
    const [selected, setSelected] = useState<SentimentItem | null>(null);

    const fetchSentiment = useCallback(async () => {
        try {
            const res = await fetch(`/api/sentiment?mode=${mode}`);
            if (!res.ok) return;
            const data = await res.json();
            // Always update — even if empty, clear loading so UI doesn't spin forever
            if (Array.isArray(data.sentiments)) {
                setSentiments(data.sentiments);
            }
        } catch { /* keep last data on network error */ }
        finally {
            setSentimentLoading(false); // always clear, regardless of result
        }
    }, [mode]);

    useEffect(() => {
        fetchSentiment();
        const t = setInterval(fetchSentiment, POLL_MS);
        return () => clearInterval(t);
    }, [fetchSentiment]);

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

    // Map ticker epics to sentiment items for click-through
    const tickerSentiment: Record<string, string> = {
        'GOLD': 'GOLD', 'OIL_CRUDE': 'OIL_CRUDE',
        'BTCUSD': 'BTCUSD',
    };

    const handleTickerClick = (epic: string) => {
        const sentimentEpic = tickerSentiment[epic];
        const found = sentiments.find(s => s.epic === sentimentEpic) || {
            epic, label: epic, longPct: 50, shortPct: 50, bias: 'NEUTRAL' as Bias,
        };
        setSelected(found);
    };

    return (
        <>
            {/* Detail modal rendered at root level — no z-index competition */}
            {selected && (
                <DetailModal
                    item={selected}
                    onClose={() => setSelected(null)}
                    mode={mode}
                />
            )}

            <aside className={cn(
                "fixed right-0 top-[70px] h-[calc(100vh-70px)] bg-[#0A1622] border-l border-white/5 transition-all duration-500 z-40 hidden xl:flex flex-col",
                isOpen ? "w-80" : "w-12"
            )}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute -left-3 top-8 w-6 h-6 bg-teal rounded-full flex items-center justify-center text-dark-blue shadow-lg border border-white/10 z-50 hover:scale-110 transition-transform"
                >
                    {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

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

                        {/* Live Tickers — clickable */}
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Live Intelligence</h3>
                                <span className="text-[8px] text-teal font-black uppercase tracking-widest bg-teal/5 px-2 py-0.5 rounded border border-teal/10 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-teal animate-pulse" /> Live
                                </span>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { epic: 'GOLD', symbol: 'GOLD' },
                                    { epic: 'OIL_CRUDE', symbol: 'OIL' },
                                    { epic: 'BTCUSD', symbol: 'BTC/USD' },
                                ].map(({ epic, symbol }) => (
                                    <TickerRow
                                        key={epic}
                                        symbol={symbol}
                                        {...getPriceData(epic)}
                                        onClick={() => handleTickerClick(epic)}
                                    />
                                ))}
                                <p className="text-[8px] text-gray-700 text-center mt-2 font-black uppercase tracking-widest">
                                    Click any ticker for detailed analytics
                                </p>
                            </div>
                        </div>

                        {/* Sentiment — clickable */}
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
                                <div className="space-y-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {sentiments.map(s => (
                                        <SentimentRow
                                            key={s.epic}
                                            {...s}
                                            onClick={() => setSelected(s)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TickerRow({ symbol, price, change, isUp, onClick }: {
    symbol: string; price: string; change: string; isUp: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal/30 hover:bg-teal/5 transition-all group cursor-pointer text-left"
        >
            <div>
                <p className="text-xs font-black text-white tracking-tight group-hover:text-teal transition-colors">{symbol}</p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{price}</p>
            </div>
            <div className={cn(
                "text-[9px] font-black px-2 py-1 rounded-lg border transition-all",
                isUp ? "text-teal bg-teal/10 border-teal/20" : "text-red-400 bg-red-500/10 border-red-500/20"
            )}>
                {isUp ? <TrendingUp size={9} className="inline mr-0.5" /> : <TrendingDown size={9} className="inline mr-0.5" />}
                {change}
            </div>
        </button>
    );
}

function SentimentRow({ label, longPct, shortPct, bias, onClick }: SentimentItem & { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal/30 hover:bg-teal/5 transition-all group text-left"
        >
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-white tracking-tight group-hover:text-teal transition-colors">{label}</span>
                <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                    bias === 'BULLISH' ? 'text-teal bg-teal/10' :
                        bias === 'BEARISH' ? 'text-red-400 bg-red-500/10' :
                            'text-gray-500 bg-white/5'
                )}>
                    {bias}
                </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                <div className="h-full bg-teal rounded-l-full transition-all duration-700" style={{ width: `${longPct}%` }} />
                <div className="h-full bg-red-500 rounded-r-full transition-all duration-700" style={{ width: `${shortPct}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
                <span className="text-[8px] font-black text-teal">{longPct}% Long</span>
                <span className="text-[8px] font-black text-gray-600 group-hover:text-teal transition-colors">Click for details →</span>
                <span className="text-[8px] font-black text-red-400">{shortPct}% Short</span>
            </div>
        </button>
    );
}
