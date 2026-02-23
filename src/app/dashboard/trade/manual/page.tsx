"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    TrendingUp, TrendingDown, ChevronDown, Target, ShieldCheck,
    Zap, BarChart2, RefreshCw, AlertTriangle, CheckCircle2,
    Activity, ArrowUpRight, ArrowDownRight, Clock, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketData } from "@/contexts/MarketDataContext";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from "recharts";

// ─── Instruments ──────────────────────────────────────────────────────────────
const INSTRUMENTS = [
    { epic: "GOLD", label: "Gold", symbol: "XAU/USD", category: "Metals", flag: "🥇" },
    { epic: "SILVER", label: "Silver", symbol: "XAG/USD", category: "Metals", flag: "🥈" },
    { epic: "OIL_CRUDE", label: "Crude Oil", symbol: "WTI", category: "Energy", flag: "🛢️" },
    { epic: "NATGAS", label: "Natural Gas", symbol: "NG", category: "Energy", flag: "🔥" },
    { epic: "EURUSD", label: "EUR/USD", symbol: "EURUSD", category: "Forex", flag: "💶" },
    { epic: "BTCUSD", label: "Bitcoin", symbol: "BTC/USD", category: "Crypto", flag: "₿" },
];

type Resolution = "MINUTE_5" | "MINUTE_30" | "HOUR" | "DAY";
const RESOLUTIONS: { key: Resolution; label: string }[] = [
    { key: "MINUTE_5", label: "5M" },
    { key: "MINUTE_30", label: "30M" },
    { key: "HOUR", label: "1H" },
    { key: "DAY", label: "1D" },
];

interface ChartPoint { time: string; open: number; high: number; low: number; close: number; }
interface Snapshot { bid: number; offer: number; high: number; low: number; netChange: number; percentageChange: number; status: string; }
interface Analysis { signal: "BUY" | "SELL" | "NEUTRAL"; strength: number; reason: string; shortTrend: string; longTrend: string; rsi: number; support: number; resistance: number; }

// ─────────────────────────────────────────────────────────────────────────────
// Market Analysis Engine (pure client-side TA — no extra API call needed)
// ─────────────────────────────────────────────────────────────────────────────
function analyseMarket(chart: ChartPoint[]): Analysis | null {
    if (chart.length < 14) return null;

    const closes = chart.map(c => c.close);
    const n = closes.length;

    // EMA helper
    const ema = (data: number[], period: number) => {
        const k = 2 / (period + 1);
        return data.reduce<number[]>((acc, v, i) => {
            if (i === 0) return [v];
            return [...acc, v * k + acc[acc.length - 1] * (1 - k)];
        }, []);
    };

    // RSI (14)
    const gains: number[] = [], losses: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        gains.push(diff > 0 ? diff : 0);
        losses.push(diff < 0 ? -diff : 0);
    }
    const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    // EMA 9 & 21
    const ema9 = ema(closes, 9);
    const ema21 = ema(closes, 21);
    const ema50 = ema(closes, Math.min(50, n));

    const lastEma9 = ema9[ema9.length - 1];
    const lastEma21 = ema21[ema21.length - 1];
    const lastEma50 = ema50[ema50.length - 1];
    const lastClose = closes[n - 1];

    // Short trend (EMA9 vs EMA21)
    const shortTrend = lastEma9 > lastEma21 ? "Bullish" : "Bearish";
    // Long trend (price vs EMA50)
    const longTrend = lastClose > lastEma50 ? "Bullish" : "Bearish";

    // Support & Resistance (simple swing high/low from last 20 candles)
    const recent = chart.slice(-20);
    const support = Math.min(...recent.map(c => c.low));
    const resistance = Math.max(...recent.map(c => c.high));

    // Signal logic
    let score = 0;
    if (shortTrend === "Bullish") score++;
    if (longTrend === "Bullish") score++;
    if (rsi < 40) score += 2;  // oversold → buy
    if (rsi > 60) score -= 2;  // overbought → sell
    if (lastEma9 > lastEma21) score++;
    else score--;

    const signal: "BUY" | "SELL" | "NEUTRAL" = score >= 2 ? "BUY" : score <= -2 ? "SELL" : "NEUTRAL";
    const strength = Math.min(100, Math.round(Math.abs(score) * 20 + 20));

    const reasons: Record<string, string> = {
        BUY: `EMA crossover bullish + RSI ${rsi.toFixed(0)} (${rsi < 40 ? 'oversold, strong buy' : 'neutral'}). Price above key EMAs.`,
        SELL: `Bearish EMA crossover + RSI ${rsi.toFixed(0)} (${rsi > 60 ? 'overbought, strong sell' : 'neutral'}). Price below key EMAs.`,
        NEUTRAL: `Mixed signals: RSI ${rsi.toFixed(0)}, short trend ${shortTrend}, long trend ${longTrend}. Wait for clearer setup.`,
    };

    return { signal, strength, reason: reasons[signal], shortTrend, longTrend, rsi, support, resistance };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ManualTradingPage() {
    const { mode } = useMarketData();

    // Instrument selection
    const [selectedInstrument, setSelectedInstrument] = useState(INSTRUMENTS[0]);
    const [showInstrumentPicker, setShowInstrumentPicker] = useState(false);

    // Chart
    const [resolution, setResolution] = useState<Resolution>("HOUR");
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [chartLoading, setChartLoading] = useState(true);

    // Analysis
    const [analysis, setAnalysis] = useState<Analysis | null>(null);

    // Trade form
    const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
    const [size, setSize] = useState("0.1");
    const [takeProfit, setTakeProfit] = useState("");
    const [stopLoss, setStopLoss] = useState("");
    const [trailingStop, setTrailingStop] = useState(false);

    // Execution
    const [submitting, setSubmitting] = useState(false);
    const [execResult, setExecResult] = useState<{ success: boolean; message: string } | null>(null);

    // ── Fetch chart + snapshot ────────────────────────────────────────────────
    const fetchChart = useCallback(async () => {
        setChartLoading(true);
        try {
            const res = await fetch(
                `/api/chart/${selectedInstrument.epic}?mode=${mode}&resolution=${resolution}&max=60`
            );
            if (res.ok) {
                const data = await res.json();
                if (data.chartData?.length > 0) {
                    setChartData(data.chartData);
                    setAnalysis(analyseMarket(data.chartData));
                }
                if (data.snapshot) setSnapshot(data.snapshot);
            }
        } finally {
            setChartLoading(false);
        }
    }, [selectedInstrument.epic, mode, resolution]);

    // Initial fetch + poll every 10s
    useEffect(() => {
        fetchChart();
        const t = setInterval(fetchChart, 10_000);
        return () => clearInterval(t);
    }, [fetchChart]);

    // Auto-compute TP/SL from snapshot when instrument or direction changes
    useEffect(() => {
        if (!snapshot) return;
        const price = direction === "BUY" ? snapshot.offer : snapshot.bid;
        if (!price) return;
        const spread = Math.abs(snapshot.offer - snapshot.bid);
        const atr = (snapshot.high - snapshot.low) || spread * 10;
        const tp = direction === "BUY" ? price + atr * 1.5 : price - atr * 1.5;
        const sl = direction === "BUY" ? price - atr * 1.0 : price + atr * 1.0;
        setTakeProfit(tp.toFixed(selectedInstrument.epic.includes("USD") ? 5 : 2));
        setStopLoss(sl.toFixed(selectedInstrument.epic.includes("USD") ? 5 : 2));
    }, [snapshot, direction, selectedInstrument]);

    // ── Place trade ───────────────────────────────────────────────────────────
    const handleTrade = async () => {
        setSubmitting(true);
        setExecResult(null);
        try {
            const res = await fetch("/api/trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    epic: selectedInstrument.epic,
                    direction,
                    size: parseFloat(size),
                    takeProfit: takeProfit ? parseFloat(takeProfit) : null,
                    stopLoss: stopLoss ? parseFloat(stopLoss) : null,
                    trailingStop,
                    mode,
                }),
            });
            const data = await res.json();
            if (res.ok && !data.error) {
                setExecResult({ success: true, message: `Order placed! Deal ref: ${data.dealReference || data.dealId || 'confirmed'}` });
            } else {
                setExecResult({ success: false, message: data.error || "Order rejected by Capital.com" });
            }
        } catch (e: any) {
            setExecResult({ success: false, message: e.message });
        } finally {
            setSubmitting(false);
            setTimeout(() => setExecResult(null), 8000);
        }
    };

    const isUp = (snapshot?.percentageChange ?? 0) >= 0;
    const currentPrice = snapshot
        ? direction === "BUY"
            ? snapshot.offer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })
            : snapshot.bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })
        : "--";

    const spread = snapshot ? Math.abs(snapshot.offer - snapshot.bid).toFixed(4) : "--";

    return (
        <div className="min-h-screen bg-[#060f1a] p-4 md:p-6 lg:p-8">
            {/* ── Page Header ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center">
                            <BarChart2 size={16} className="text-teal" />
                        </div>
                        Manual Trading
                    </h1>
                    <p className="text-[11px] text-gray-500 mt-1 font-bold uppercase tracking-widest">
                        Live execution via Capital.com · {mode === "demo" ? "Demo Account" : "Real Account"}
                    </p>
                </div>
                <div className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                    mode === "demo"
                        ? "text-teal bg-teal/10 border-teal/20"
                        : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                )}>
                    {mode === "demo" ? "Demo Mode" : "Live Mode"}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
                {/* ── LEFT: Chart + Analysis ───────────────────────────────── */}
                <div className="space-y-5">
                    {/* Instrument Picker */}
                    <div className="bg-[#0A1622] border border-white/5 rounded-3xl p-5">
                        <div className="flex flex-wrap gap-3 items-center">
                            {/* Active instrument */}
                            <button
                                onClick={() => setShowInstrumentPicker(!showInstrumentPicker)}
                                className="flex items-center gap-3 bg-teal/10 border border-teal/20 rounded-2xl px-5 py-3 hover:bg-teal/20 transition-all group"
                            >
                                <span className="text-xl">{selectedInstrument.flag}</span>
                                <div className="text-left">
                                    <p className="text-xs font-black text-white tracking-tight">{selectedInstrument.label}</p>
                                    <p className="text-[9px] text-gray-500 font-bold">{selectedInstrument.symbol}</p>
                                </div>
                                <ChevronDown size={14} className={cn("text-teal transition-transform ml-2", showInstrumentPicker && "rotate-180")} />
                            </button>

                            {/* Quick-select chips */}
                            {INSTRUMENTS.filter(i => i.epic !== selectedInstrument.epic).map(inst => (
                                <button
                                    key={inst.epic}
                                    onClick={() => { setSelectedInstrument(inst); setShowInstrumentPicker(false); }}
                                    className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl px-4 py-2.5 hover:border-teal/20 hover:bg-teal/5 transition-all"
                                >
                                    <span className="text-base">{inst.flag}</span>
                                    <span className="text-[10px] font-black text-gray-400 hover:text-teal">{inst.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Header */}
                    <div className="bg-[#0A1622] border border-white/5 rounded-3xl p-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-baseline gap-4">
                                <span className="text-3xl font-black text-white font-mono tracking-tight">
                                    {currentPrice}
                                </span>
                                {snapshot && (
                                    <span className={cn(
                                        "flex items-center gap-1 text-sm font-black px-3 py-1 rounded-xl",
                                        isUp ? "text-teal bg-teal/10" : "text-red-400 bg-red-500/10"
                                    )}>
                                        {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                        {snapshot.percentageChange > 0 ? "+" : ""}{snapshot.percentageChange.toFixed(2)}%
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-[10px] font-black text-gray-500">
                                {snapshot && (<>
                                    <div><span className="text-gray-700 mr-1">BID</span><span className="text-white">{snapshot.bid.toFixed(4)}</span></div>
                                    <div><span className="text-gray-700 mr-1">ASK</span><span className="text-white">{snapshot.offer.toFixed(4)}</span></div>
                                    <div><span className="text-gray-700 mr-1">H</span><span className="text-teal">{snapshot.high.toFixed(2)}</span></div>
                                    <div><span className="text-gray-700 mr-1">L</span><span className="text-red-400">{snapshot.low.toFixed(2)}</span></div>
                                    <div><span className="text-gray-700 mr-1">SPREAD</span><span className="text-white">{spread}</span></div>
                                </>)}
                                <button
                                    onClick={fetchChart}
                                    className="p-1 hover:text-teal transition-colors"
                                >
                                    <RefreshCw size={12} className={chartLoading ? "animate-spin text-teal" : ""} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Resolution selector + Chart */}
                    <div className="bg-[#0A1622] border border-white/5 rounded-3xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            {RESOLUTIONS.map(r => (
                                <button
                                    key={r.key}
                                    onClick={() => setResolution(r.key)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        resolution === r.key
                                            ? "bg-teal text-dark-blue shadow-lg"
                                            : "bg-white/5 text-gray-500 hover:text-white border border-white/10"
                                    )}
                                >
                                    {r.label}
                                </button>
                            ))}
                            <span className="ml-auto text-[9px] text-gray-600 font-black uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10} /> Updated every 10s
                            </span>
                        </div>

                        <div className="h-72 w-full">
                            {chartLoading && chartData.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="w-10 h-10 border-2 border-teal/20 border-t-teal rounded-full animate-spin" />
                                </div>
                            ) : chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                                    <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                                        <defs>
                                            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={isUp ? "#00BFA6" : "#ef4444"} stopOpacity={0.35} />
                                                <stop offset="100%" stopColor={isUp ? "#00BFA6" : "#ef4444"} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                                        <XAxis
                                            dataKey="time"
                                            tick={{ fill: '#374151', fontSize: 9, fontWeight: 'bold' }}
                                            axisLine={false} tickLine={false}
                                            interval={Math.max(1, Math.floor(chartData.length / 7))}
                                        />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            tick={{ fill: '#374151', fontSize: 9, fontWeight: 'bold' }}
                                            axisLine={false} tickLine={false}
                                            width={70}
                                            tickFormatter={(v) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                        />
                                        <Tooltip
                                            contentStyle={{ background: '#0A1622', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '11px' }}
                                            labelStyle={{ color: '#9ca3af' }}
                                        />
                                        {/* Support & Resistance reference lines */}
                                        {analysis && (
                                            <>
                                                <ReferenceLine y={analysis.support} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'S', fill: '#ef4444', fontSize: 9 }} />
                                                <ReferenceLine y={analysis.resistance} stroke="#00BFA6" strokeDasharray="4 2" label={{ value: 'R', fill: '#00BFA6', fontSize: 9 }} />
                                            </>
                                        )}
                                        <Area
                                            type="monotone"
                                            dataKey="close"
                                            stroke={isUp ? "#00BFA6" : "#ef4444"}
                                            strokeWidth={2}
                                            fill="url(#priceGrad)"
                                            dot={false}
                                            activeDot={{ r: 4, fill: isUp ? "#00BFA6" : "#ef4444" }}
                                            animationDuration={600}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                    <Activity size={32} className="mb-3 opacity-30" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Chart data unavailable</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Market Analysis Panel */}
                    {analysis && (
                        <div className={cn(
                            "rounded-3xl border p-6",
                            analysis.signal === "BUY" ? "bg-teal/5 border-teal/20"
                                : analysis.signal === "SELL" ? "bg-red-500/5 border-red-500/20"
                                    : "bg-white/[0.02] border-white/5"
                        )}>
                            <div className="flex items-start justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center",
                                        analysis.signal === "BUY" ? "bg-teal/20"
                                            : analysis.signal === "SELL" ? "bg-red-500/20"
                                                : "bg-white/10"
                                    )}>
                                        {analysis.signal === "BUY" ? <TrendingUp size={18} className="text-teal" />
                                            : analysis.signal === "SELL" ? <TrendingDown size={18} className="text-red-400" />
                                                : <Activity size={18} className="text-gray-400" />}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                            <BookOpen size={9} className="inline mr-1" />
                                            Market Analysis Engine
                                        </p>
                                        <p className={cn(
                                            "text-xl font-black",
                                            analysis.signal === "BUY" ? "text-teal" : analysis.signal === "SELL" ? "text-red-400" : "text-gray-400"
                                        )}>
                                            {analysis.signal === "BUY" ? "LONG Signal" : analysis.signal === "SELL" ? "SHORT Signal" : "No Signal"}
                                        </p>
                                    </div>
                                </div>
                                {/* Signal Strength meter */}
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Confidence</p>
                                    <p className={cn(
                                        "text-2xl font-black",
                                        analysis.strength > 60 ? (analysis.signal === "BUY" ? "text-teal" : "text-red-400") : "text-gray-400"
                                    )}>{analysis.strength}%</p>
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                {[
                                    { label: "RSI (14)", value: analysis.rsi.toFixed(1), color: analysis.rsi > 70 ? "text-red-400" : analysis.rsi < 30 ? "text-teal" : "text-white" },
                                    { label: "Short Trend", value: analysis.shortTrend, color: analysis.shortTrend === "Bullish" ? "text-teal" : "text-red-400" },
                                    { label: "Long Trend", value: analysis.longTrend, color: analysis.longTrend === "Bullish" ? "text-teal" : "text-red-400" },
                                    { label: "Signal", value: analysis.signal, color: analysis.signal === "BUY" ? "text-teal" : analysis.signal === "SELL" ? "text-red-400" : "text-gray-400" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="bg-black/20 rounded-2xl p-3 border border-white/5">
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">{label}</p>
                                        <p className={cn("text-sm font-black", color)}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            <p className="text-[11px] text-gray-400 leading-relaxed">{analysis.reason}</p>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Trade Form ─────────────────────────────────────── */}
                <div className="space-y-4">

                    {/* Direction Selector */}
                    <div className="bg-[#0A1622] border border-white/5 rounded-3xl p-5">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap size={10} className="text-teal" /> Direction
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setDirection("BUY")}
                                className={cn(
                                    "py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border flex flex-col items-center gap-1",
                                    direction === "BUY"
                                        ? "bg-teal text-dark-blue border-teal shadow-[0_0_20px_rgba(0,191,166,0.3)]"
                                        : "bg-teal/5 text-teal/60 border-teal/10 hover:border-teal/30 hover:bg-teal/10"
                                )}
                            >
                                <TrendingUp size={18} />
                                BUY / LONG
                            </button>
                            <button
                                onClick={() => setDirection("SELL")}
                                className={cn(
                                    "py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border flex flex-col items-center gap-1",
                                    direction === "SELL"
                                        ? "bg-red-500 text-white border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                        : "bg-red-500/5 text-red-500/60 border-red-500/10 hover:border-red-500/30 hover:bg-red-500/10"
                                )}
                            >
                                <TrendingDown size={18} />
                                SELL / SHORT
                            </button>
                        </div>
                    </div>

                    {/* Lot Size */}
                    <div className="bg-[#0A1622] border border-white/5 rounded-3xl p-5 space-y-4">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Target size={10} className="text-teal" /> Position Size
                        </p>

                        <div>
                            <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest px-1">Lot Size</label>
                            <input
                                type="number"
                                value={size}
                                onChange={e => setSize(e.target.value)}
                                step="0.01"
                                min="0.01"
                                className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-teal/40 focus:bg-white/[0.07] transition-all font-mono"
                                placeholder="0.10"
                            />
                        </div>

                        {/* Quick size buttons */}
                        <div className="flex gap-2">
                            {["0.01", "0.1", "0.5", "1.0"].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSize(s)}
                                    className={cn(
                                        "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all border",
                                        size === s
                                            ? "bg-teal/20 text-teal border-teal/30"
                                            : "bg-white/5 text-gray-500 border-white/5 hover:border-white/10 hover:text-gray-300"
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* TP / SL */}
                    <div className="bg-[#0A1622] border border-white/5 rounded-3xl p-5 space-y-4">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck size={10} className="text-amber-400" /> Risk Management
                        </p>

                        <div>
                            <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest px-1 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-teal inline-block" /> Take Profit
                            </label>
                            <input
                                type="number"
                                value={takeProfit}
                                onChange={e => setTakeProfit(e.target.value)}
                                className="mt-1 w-full bg-white/5 border border-teal/10 rounded-xl px-4 py-3 text-teal font-bold text-sm focus:outline-none focus:border-teal/40 transition-all font-mono"
                                placeholder="Auto-calculated"
                                step="any"
                            />
                        </div>

                        <div>
                            <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest px-1 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Stop Loss
                            </label>
                            <input
                                type="number"
                                value={stopLoss}
                                onChange={e => setStopLoss(e.target.value)}
                                className="mt-1 w-full bg-white/5 border border-red-500/10 rounded-xl px-4 py-3 text-red-400 font-bold text-sm focus:outline-none focus:border-red-500/30 transition-all font-mono"
                                placeholder="Auto-calculated"
                                step="any"
                            />
                        </div>

                        {/* Trailing Stop toggle */}
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div
                                onClick={() => setTrailingStop(!trailingStop)}
                                className={cn(
                                    "w-10 h-5 rounded-full transition-all border relative flex-shrink-0",
                                    trailingStop ? "bg-teal border-teal" : "bg-white/10 border-white/10"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                                    trailingStop ? "left-5" : "left-0.5"
                                )} />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 group-hover:text-white transition-colors uppercase tracking-widest">
                                Trailing Stop
                            </span>
                        </label>

                        {/* Risk/Reward display */}
                        {takeProfit && stopLoss && snapshot && (
                            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 text-[9px] font-black text-gray-500 space-y-2">
                                {(() => {
                                    const entry = direction === "BUY" ? snapshot.offer : snapshot.bid;
                                    const tp = parseFloat(takeProfit);
                                    const sl = parseFloat(stopLoss);
                                    const reward = Math.abs(tp - entry);
                                    const risk = Math.abs(sl - entry);
                                    const rrr = risk > 0 ? (reward / risk).toFixed(2) : "—";
                                    return (
                                        <>
                                            <div className="flex justify-between">
                                                <span>Risk (SL distance)</span>
                                                <span className="text-red-400">{risk.toFixed(4)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Reward (TP distance)</span>
                                                <span className="text-teal">{reward.toFixed(4)}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-white/5 pt-2">
                                                <span>Risk/Reward Ratio</span>
                                                <span className={cn("font-black", parseFloat(String(rrr)) >= 1.5 ? "text-teal" : parseFloat(String(rrr)) >= 1 ? "text-amber-400" : "text-red-400")}>
                                                    1:{rrr}
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Execute Button */}
                    <div className="bg-[#0A1622] border border-white/5 rounded-3xl p-5 space-y-4">
                        {/* Order summary */}
                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-2">
                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3">Order Summary</p>
                            {[
                                { label: "Instrument", value: selectedInstrument.label },
                                { label: "Direction", value: direction, bold: true },
                                { label: "Size", value: `${size} lots` },
                                { label: "Price", value: currentPrice },
                                { label: "TP", value: takeProfit || "—" },
                                { label: "SL", value: stopLoss || "—" },
                            ].map(({ label, value, bold }) => (
                                <div key={label} className="flex justify-between items-center text-[10px]">
                                    <span className="text-gray-600 font-black uppercase tracking-widest">{label}</span>
                                    <span className={cn(
                                        "font-black",
                                        bold && direction === "BUY" ? "text-teal" :
                                            bold && direction === "SELL" ? "text-red-400" :
                                                "text-gray-300"
                                    )}>{value}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleTrade}
                            disabled={submitting || !size}
                            className={cn(
                                "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                direction === "BUY"
                                    ? "bg-teal text-dark-blue hover:bg-teal/90 shadow-[0_4px_20px_rgba(0,191,166,0.4)]"
                                    : "bg-red-500 text-white hover:bg-red-400 shadow-[0_4px_20px_rgba(239,68,68,0.4)]",
                                (submitting || !size) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {submitting ? (
                                <><RefreshCw size={16} className="animate-spin" /> Executing...</>
                            ) : (
                                <><Zap size={16} /> Place {direction} Order</>
                            )}
                        </button>

                        {/* Result toast */}
                        {execResult && (
                            <div className={cn(
                                "flex items-start gap-3 p-4 rounded-2xl border text-sm font-bold",
                                execResult.success
                                    ? "bg-teal/10 border-teal/20 text-teal"
                                    : "bg-red-500/10 border-red-500/20 text-red-400"
                            )}>
                                {execResult.success ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />}
                                <span className="text-[11px] leading-relaxed">{execResult.message}</span>
                            </div>
                        )}

                        <p className="text-[9px] text-gray-700 text-center font-black uppercase tracking-widest">
                            {mode === "demo" ? "Demo account — virtual funds only" : "⚠️ Real funds will be used"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
