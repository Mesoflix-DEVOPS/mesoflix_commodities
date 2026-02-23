"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
    BarChart3, Cpu, History, TrendingUp, TrendingDown,
    ChevronDown, Zap, Activity, RefreshCw, Target, ShieldCheck,
    AlertTriangle, CheckCircle2, BookOpen, ArrowUpRight, ArrowDownRight, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketData } from "@/contexts/MarketDataContext";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from "recharts";

// ─── Instruments ──────────────────────────────────────────────────────────────
const INSTRUMENTS = [
    { epic: "GOLD", label: "Gold", symbol: "XAU/USD", flag: "🥇" },
    { epic: "SILVER", label: "Silver", symbol: "XAG/USD", flag: "🥈" },
    { epic: "OIL_CRUDE", label: "Crude Oil", symbol: "WTI", flag: "🛢️" },
    { epic: "NATGAS", label: "Natural Gas", symbol: "NG", flag: "🔥" },
    { epic: "EURUSD", label: "EUR/USD", symbol: "EURUSD", flag: "💶" },
    { epic: "BTCUSD", label: "Bitcoin", symbol: "BTC/USD", flag: "₿" },
];

type Resolution = "MINUTE_5" | "MINUTE_30" | "HOUR" | "DAY";

interface ChartPoint { time: string; open: number; high: number; low: number; close: number; }
interface Snapshot { bid: number; offer: number; high: number; low: number; netChange: number; percentageChange: number; }
interface Analysis { signal: "BUY" | "SELL" | "NEUTRAL"; strength: number; reason: string; shortTrend: string; longTrend: string; rsi: number; support: number; resistance: number; }

// ─── Client-side TA engine ────────────────────────────────────────────────────
function analyseMarket(chart: ChartPoint[]): Analysis | null {
    if (chart.length < 14) return null;
    const closes = chart.map(c => c.close);
    const n = closes.length;
    const ema = (data: number[], period: number) => {
        const k = 2 / (period + 1);
        return data.reduce<number[]>((acc, v, i) => i === 0 ? [v] : [...acc, v * k + acc[acc.length - 1] * (1 - k)], []);
    };
    const gains: number[] = [], losses: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        gains.push(d > 0 ? d : 0); losses.push(d < 0 ? -d : 0);
    }
    const rsi = (() => {
        const ag = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
        const al = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
        return al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    })();
    const ema9 = ema(closes, 9);
    const ema21 = ema(closes, 21);
    const ema50 = ema(closes, Math.min(50, n));
    const shortTrend = ema9[ema9.length - 1] > ema21[ema21.length - 1] ? "Bullish" : "Bearish";
    const longTrend = closes[n - 1] > ema50[ema50.length - 1] ? "Bullish" : "Bearish";
    const recent = chart.slice(-20);
    const support = Math.min(...recent.map(c => c.low));
    const resistance = Math.max(...recent.map(c => c.high));
    let score = (shortTrend === "Bullish" ? 1 : -1) + (longTrend === "Bullish" ? 1 : -1);
    if (rsi < 40) score += 2; else if (rsi > 60) score -= 2;
    const signal: "BUY" | "SELL" | "NEUTRAL" = score >= 2 ? "BUY" : score <= -2 ? "SELL" : "NEUTRAL";
    const strength = Math.min(100, Math.round(Math.abs(score) * 20 + 20));
    return {
        signal, strength, shortTrend, longTrend, rsi, support, resistance,
        reason: signal === "BUY"
            ? `Bullish EMA crossover + RSI ${rsi.toFixed(0)} ${rsi < 40 ? "(oversold)" : ""}. Price above key moving averages.`
            : signal === "SELL"
                ? `Bearish EMA crossover + RSI ${rsi.toFixed(0)} ${rsi > 60 ? "(overbought)" : ""}. Price below key moving averages.`
                : `Mixed signals: RSI ${rsi.toFixed(0)}, short ${shortTrend}, long ${longTrend}. Wait for clearer setup.`,
    };
}

// ─── Manual Trading Tab ───────────────────────────────────────────────────────
function ManualTab({ mode }: { mode: string }) {
    const [instrument, setInstrument] = useState(INSTRUMENTS[0]);
    const [showPicker, setShowPicker] = useState(false);
    const [resolution, setResolution] = useState<Resolution>("HOUR");
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [chartLoading, setChartLoading] = useState(true);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
    const [size, setSize] = useState("0.1");
    const [takeProfit, setTakeProfit] = useState("");
    const [stopLoss, setStopLoss] = useState("");
    const [trailingStop, setTrailingStop] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [execResult, setExecResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchChart = useCallback(async () => {
        setChartLoading(true);
        try {
            const res = await fetch(`/api/chart/${instrument.epic}?mode=${mode}&resolution=${resolution}&max=60`);
            if (res.ok) {
                const d = await res.json();
                if (d.chartData?.length > 0) { setChartData(d.chartData); setAnalysis(analyseMarket(d.chartData)); }
                if (d.snapshot) setSnapshot(d.snapshot);
            }
        } finally { setChartLoading(false); }
    }, [instrument.epic, mode, resolution]);

    useEffect(() => {
        fetchChart();
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(fetchChart, 10_000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [fetchChart]);

    // Auto TP/SL from ATR
    useEffect(() => {
        if (!snapshot) return;
        const price = direction === "BUY" ? snapshot.offer : snapshot.bid;
        const atr = snapshot.high - snapshot.low || price * 0.01;
        const isForex = instrument.epic.includes("USD") && !instrument.epic.includes("BTC");
        const dp = isForex ? 5 : 2;
        setTakeProfit((direction === "BUY" ? price + atr * 1.5 : price - atr * 1.5).toFixed(dp));
        setStopLoss((direction === "BUY" ? price - atr : price + atr).toFixed(dp));
    }, [snapshot, direction, instrument]);

    const placeTrade = async () => {
        setSubmitting(true); setExecResult(null);
        try {
            const res = await fetch("/api/trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    epic: instrument.epic, direction,
                    size: parseFloat(size),
                    takeProfit: takeProfit ? parseFloat(takeProfit) : null,
                    stopLoss: stopLoss ? parseFloat(stopLoss) : null,
                    trailingStop, mode,
                }),
            });
            const d = await res.json();
            setExecResult(res.ok && !d.error
                ? { ok: true, msg: `Order placed ✓ Ref: ${d.dealReference || d.dealId || "confirmed"}` }
                : { ok: false, msg: d.error || "Order rejected by Capital.com" }
            );
        } catch (e: any) {
            setExecResult({ ok: false, msg: e.message });
        } finally {
            setSubmitting(false);
            setTimeout(() => setExecResult(null), 8000);
        }
    };

    const isUp = (snapshot?.percentageChange ?? 0) >= 0;
    const currentPrice = snapshot
        ? (direction === "BUY" ? snapshot.offer : snapshot.bid)
            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })
        : "--";

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
            {/* ── LEFT: Chart + Analysis ─────────────────────────────────── */}
            <div className="space-y-4">
                {/* Instrument picker */}
                <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 p-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setShowPicker(!showPicker)}
                            className="flex items-center gap-2 bg-teal/10 border border-teal/20 rounded-2xl px-4 py-2.5 hover:bg-teal/20 transition-all"
                        >
                            <span className="text-lg">{instrument.flag}</span>
                            <div className="text-left">
                                <p className="text-xs font-black text-white">{instrument.label}</p>
                                <p className="text-[9px] text-gray-500">{instrument.symbol}</p>
                            </div>
                            <ChevronDown size={12} className={cn("text-teal ml-1 transition-transform", showPicker && "rotate-180")} />
                        </button>
                        {INSTRUMENTS.filter(i => i.epic !== instrument.epic).map(inst => (
                            <button key={inst.epic}
                                onClick={() => { setInstrument(inst); setShowPicker(false); }}
                                className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl px-3 py-2 hover:border-teal/20 hover:bg-teal/5 transition-all"
                            >
                                <span className="text-base">{inst.flag}</span>
                                <span className="text-[10px] font-black text-gray-400">{inst.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Price header */}
                <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-baseline gap-3 flex-wrap">
                            <span className="text-3xl font-black text-white font-mono">{currentPrice}</span>
                            {snapshot && (
                                <span className={cn("text-sm font-black px-2 py-0.5 rounded-xl flex items-center gap-1",
                                    isUp ? "text-teal bg-teal/10" : "text-red-400 bg-red-500/10")}>
                                    {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                                    {snapshot.percentageChange > 0 ? "+" : ""}{snapshot.percentageChange.toFixed(2)}%
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-[10px] font-black text-gray-500 items-center">
                            {snapshot && <>
                                <span><span className="text-gray-700 mr-1">BID</span><span className="text-white">{snapshot.bid.toFixed(4)}</span></span>
                                <span><span className="text-gray-700 mr-1">ASK</span><span className="text-white">{snapshot.offer.toFixed(4)}</span></span>
                                <span><span className="text-gray-700 mr-1">H</span><span className="text-teal">{snapshot.high.toFixed(2)}</span></span>
                                <span><span className="text-gray-700 mr-1">L</span><span className="text-red-400">{snapshot.low.toFixed(2)}</span></span>
                            </>}
                            <button onClick={fetchChart} className="hover:text-teal transition-colors p-1">
                                <RefreshCw size={12} className={chartLoading ? "animate-spin text-teal" : ""} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {(["MINUTE_5", "MINUTE_30", "HOUR", "DAY"] as Resolution[]).map((r, i) => (
                            <button key={r} onClick={() => setResolution(r)}
                                className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    resolution === r ? "bg-teal text-dark-blue" : "bg-white/5 text-gray-500 hover:text-white border border-white/10"
                                )}
                            >
                                {["5M", "30M", "1H", "1D"][i]}
                            </button>
                        ))}
                        <span className="ml-auto text-[9px] text-gray-600 font-black uppercase tracking-widest flex items-center gap-1">
                            <Clock size={9} /> 10s update
                        </span>
                    </div>
                    <div className="h-64 w-full">
                        {chartLoading && chartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-teal/20 border-t-teal rounded-full animate-spin" />
                            </div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                                    <defs>
                                        <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={isUp ? "#00BFA6" : "#ef4444"} stopOpacity={0.3} />
                                            <stop offset="100%" stopColor={isUp ? "#00BFA6" : "#ef4444"} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="time" tick={{ fill: '#374151', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={Math.max(1, Math.floor(chartData.length / 6))} />
                                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#374151', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} width={65}
                                        tickFormatter={v => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} />
                                    <Tooltip contentStyle={{ background: '#0A1622', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '11px' }} labelStyle={{ color: '#9ca3af' }} />
                                    {analysis && <>
                                        <ReferenceLine y={analysis.support} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'S', fill: '#ef4444', fontSize: 9 }} />
                                        <ReferenceLine y={analysis.resistance} stroke="#00BFA6" strokeDasharray="4 2" label={{ value: 'R', fill: '#00BFA6', fontSize: 9 }} />
                                    </>}
                                    <Area type="monotone" dataKey="close" stroke={isUp ? "#00BFA6" : "#ef4444"} strokeWidth={2.5} fill="url(#cGrad)" dot={false} activeDot={{ r: 4 }} animationDuration={600} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-700">
                                <Activity size={28} className="mb-3 opacity-40" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Chart data unavailable</p>
                                <p className="text-[9px] text-gray-700 mt-1">Check Netlify logs for Capital.com error</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Analysis badge */}
                {analysis && (
                    <div className={cn("rounded-3xl border p-5", analysis.signal === "BUY" ? "bg-teal/5 border-teal/20" : analysis.signal === "SELL" ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.02] border-white/5")}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", analysis.signal === "BUY" ? "bg-teal/20" : analysis.signal === "SELL" ? "bg-red-500/20" : "bg-white/10")}>
                                    {analysis.signal === "BUY" ? <TrendingUp size={16} className="text-teal" /> : analysis.signal === "SELL" ? <TrendingDown size={16} className="text-red-400" /> : <Activity size={16} className="text-gray-400" />}
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5"><BookOpen size={8} className="inline mr-1" />Analysis Engine</p>
                                    <p className={cn("text-base font-black", analysis.signal === "BUY" ? "text-teal" : analysis.signal === "SELL" ? "text-red-400" : "text-gray-400")}>
                                        {analysis.signal === "BUY" ? "LONG Signal" : analysis.signal === "SELL" ? "SHORT Signal" : "No Signal"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-0.5">Confidence</p>
                                <p className={cn("text-xl font-black", analysis.strength > 60 ? (analysis.signal === "BUY" ? "text-teal" : "text-red-400") : "text-gray-400")}>{analysis.strength}%</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            {[
                                { l: "RSI", v: analysis.rsi.toFixed(1), c: analysis.rsi > 70 ? "text-red-400" : analysis.rsi < 30 ? "text-teal" : "text-white" },
                                { l: "Short", v: analysis.shortTrend, c: analysis.shortTrend === "Bullish" ? "text-teal" : "text-red-400" },
                                { l: "Long", v: analysis.longTrend, c: analysis.longTrend === "Bullish" ? "text-teal" : "text-red-400" },
                                { l: "Signal", v: analysis.signal, c: analysis.signal === "BUY" ? "text-teal" : analysis.signal === "SELL" ? "text-red-400" : "text-gray-400" },
                            ].map(({ l, v, c }) => (
                                <div key={l} className="bg-black/20 rounded-2xl p-3 border border-white/5">
                                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">{l}</p>
                                    <p className={cn("text-xs font-black", c)}>{v}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{analysis.reason}</p>
                    </div>
                )}
            </div>

            {/* ── RIGHT: Trade Form ─────────────────────────────────────────── */}
            <div className="space-y-4">
                {/* Direction */}
                <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 p-5">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Zap size={9} className="text-teal" />Direction</p>
                    <div className="grid grid-cols-2 gap-3">
                        {(["BUY", "SELL"] as const).map(d => (
                            <button key={d} onClick={() => setDirection(d)}
                                className={cn("py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border flex flex-col items-center gap-1",
                                    direction === d
                                        ? d === "BUY" ? "bg-teal text-dark-blue border-teal shadow-[0_0_20px_rgba(0,191,166,0.3)]" : "bg-red-500 text-white border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                        : d === "BUY" ? "bg-teal/5 text-teal/50 border-teal/10 hover:border-teal/30 hover:bg-teal/10" : "bg-red-500/5 text-red-400/50 border-red-500/10 hover:border-red-500/30 hover:bg-red-500/10"
                                )}
                            >
                                {d === "BUY" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                {d} / {d === "BUY" ? "LONG" : "SHORT"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Size */}
                <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 p-5">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Target size={9} className="text-teal" />Position Size</p>
                    <input type="number" value={size} onChange={e => setSize(e.target.value)} step="0.01" min="0.01"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm font-mono focus:outline-none focus:border-teal/40 transition-all mb-3" />
                    <div className="flex gap-2">
                        {["0.01", "0.1", "0.5", "1.0"].map(s => (
                            <button key={s} onClick={() => setSize(s)}
                                className={cn("flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all border",
                                    size === s ? "bg-teal/20 text-teal border-teal/30" : "bg-white/5 text-gray-500 border-white/5 hover:text-gray-300 hover:border-white/10"
                                )}>{s}</button>
                        ))}
                    </div>
                </div>

                {/* TP / SL */}
                <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 p-5 space-y-3">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={9} className="text-amber-400" />Risk Management</p>
                    <div>
                        <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest px-1 flex items-center gap-1 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />Take Profit
                        </label>
                        <input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} step="any"
                            className="w-full bg-white/5 border border-teal/10 rounded-xl px-4 py-2.5 text-teal font-bold text-sm font-mono focus:outline-none focus:border-teal/30 transition-all" />
                    </div>
                    <div>
                        <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest px-1 flex items-center gap-1 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Stop Loss
                        </label>
                        <input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} step="any"
                            className="w-full bg-white/5 border border-red-500/10 rounded-xl px-4 py-2.5 text-red-400 font-bold text-sm font-mono focus:outline-none focus:border-red-500/20 transition-all" />
                    </div>
                    {/* Trailing stop toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div onClick={() => setTrailingStop(!trailingStop)}
                            className={cn("w-9 h-5 rounded-full transition-all border relative flex-shrink-0 cursor-pointer", trailingStop ? "bg-teal border-teal" : "bg-white/10 border-white/10")}>
                            <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", trailingStop ? "left-[18px]" : "left-0.5")} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trailing Stop</span>
                    </label>
                    {/* R:R display */}
                    {takeProfit && stopLoss && snapshot && (() => {
                        const entry = direction === "BUY" ? snapshot.offer : snapshot.bid;
                        const tp = parseFloat(takeProfit), sl = parseFloat(stopLoss);
                        const reward = Math.abs(tp - entry), risk = Math.abs(sl - entry);
                        const rrr = risk > 0 ? (reward / risk).toFixed(2) : "—";
                        return (
                            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 text-[9px] font-black space-y-1.5">
                                <div className="flex justify-between"><span className="text-gray-600">Risk</span><span className="text-red-400">{risk.toFixed(4)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">Reward</span><span className="text-teal">{reward.toFixed(4)}</span></div>
                                <div className="flex justify-between pt-1.5 border-t border-white/5">
                                    <span className="text-gray-600">R:R Ratio</span>
                                    <span className={cn("font-black", parseFloat(String(rrr)) >= 1.5 ? "text-teal" : parseFloat(String(rrr)) >= 1 ? "text-amber-400" : "text-red-400")}>1:{rrr}</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Execute */}
                <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 p-5 space-y-3">
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-2">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">Order Summary</p>
                        {[
                            ["Instrument", instrument.label],
                            ["Direction", direction],
                            ["Size", `${size} lots`],
                            ["Entry", currentPrice],
                            ["TP", takeProfit || "—"],
                            ["SL", stopLoss || "—"],
                        ].map(([l, v]) => (
                            <div key={l} className="flex justify-between text-[10px]">
                                <span className="text-gray-600 font-black uppercase tracking-widest">{l}</span>
                                <span className={cn("font-black", l === "Direction" && direction === "BUY" ? "text-teal" : l === "Direction" && direction === "SELL" ? "text-red-400" : "text-gray-300")}>{v}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={placeTrade} disabled={submitting || !size}
                        className={cn("w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            direction === "BUY" ? "bg-teal text-dark-blue hover:bg-teal/90 shadow-[0_4px_20px_rgba(0,191,166,0.4)]" : "bg-red-500 text-white hover:bg-red-400 shadow-[0_4px_20px_rgba(239,68,68,0.4)]",
                            (submitting || !size) && "opacity-50 cursor-not-allowed"
                        )}>
                        {submitting ? <><RefreshCw size={15} className="animate-spin" />Executing...</> : <><Zap size={15} />Place {direction} Order</>}
                    </button>
                    {execResult && (
                        <div className={cn("flex items-start gap-3 p-4 rounded-2xl border text-[11px] font-bold",
                            execResult.ok ? "bg-teal/10 border-teal/20 text-teal" : "bg-red-500/10 border-red-500/20 text-red-400")}>
                            {execResult.ok ? <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />}
                            {execResult.msg}
                        </div>
                    )}
                    <p className="text-[9px] text-gray-700 text-center font-black uppercase tracking-widest">
                        {mode === "demo" ? "Demo account — virtual funds" : "⚠️ Real funds will be used"}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Engines tab (preserved from original) ────────────────────────────────────
function EngineCard({ id, name, description, config, onToggle }: any) {
    const isActive = config?.is_active || false;
    return (
        <div className={cn("bg-[#0E1B2A] rounded-3xl border p-8 shadow-2xl transition-all duration-500 relative overflow-hidden group",
            isActive ? "border-teal/30" : "border-white/5 hover:border-white/10")}>
            <div className="absolute top-6 right-6">
                <div className={cn("w-2.5 h-2.5 rounded-full", isActive ? "bg-teal animate-pulse shadow-[0_0_8px_#00BFA6]" : "bg-gray-700")} />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
                <Cpu size={24} className={cn(isActive ? "text-teal" : "text-gray-500")} />
            </div>
            <h3 className="text-base font-black text-white uppercase mb-1">{name}</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-6">{description}</p>
            <div className="space-y-3 mb-6">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <span>Performance</span><span className="text-teal">+12.4%</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <span>Status</span><span className={cn(isActive ? "text-teal" : "text-gray-700")}>{isActive ? "OPERATIONAL" : "IDLE"}</span>
                </div>
            </div>
            <button onClick={() => onToggle(isActive)}
                className={cn("w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                    isActive ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white" : "bg-teal text-dark-blue hover:shadow-[0_0_20px_rgba(0,191,166,0.3)]"
                )}>
                {isActive ? "TERMINATE ENGINE" : "ACTIVATE ENGINE"}
            </button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function TradingPageInner() {
    const searchParams = useSearchParams();
    const { mode } = useMarketData();
    const [activeTab, setActiveTab] = useState("manual");
    const [engineConfigs, setEngineConfigs] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        fetch("/api/engines").then(r => r.json()).then(setEngineConfigs).catch(() => { });
        fetch(`/api/dashboard?mode=${mode}`).then(r => r.json()).then(d => setHistory(d.history || [])).catch(() => { });
    }, [mode]);

    const toggleEngine = async (engineId: string, isActive: boolean) => {
        try {
            const r = await fetch("/api/engines", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ engine_id: engineId, is_active: !isActive })
            });
            if (r.ok) fetch("/api/engines").then(r => r.json()).then(setEngineConfigs);
        } catch { }
    };

    const tabs = [
        { key: "manual", label: "Manual", icon: BarChart3 },
        { key: "engines", label: "Engine Control", icon: Cpu },
        { key: "logs", label: "Execution Logs", icon: History },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-teal font-black text-[10px] uppercase tracking-[0.3em] mb-1">Execution Hub</h2>
                    <h1 className="text-3xl font-black text-white tracking-tight">Trading Desk</h1>
                </div>
                <div className="flex bg-[#0A1622] p-1.5 rounded-2xl border border-white/5 self-start sm:self-auto overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest whitespace-nowrap",
                                activeTab === t.key ? "bg-teal text-dark-blue shadow-[0_0_15px_rgba(0,191,166,0.3)]" : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}>
                            <t.icon size={12} />{t.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === "manual" && <ManualTab mode={mode} />}

            {activeTab === "engines" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <EngineCard id="vortex" name="Vortex Prime" description="Institutional Momentum Scalper" config={engineConfigs.find(c => c.engine_id === 'vortex')} onToggle={(a: boolean) => toggleEngine('vortex', a)} />
                    <EngineCard id="scalper" name="Swift Scalper" description="High-Frequency Liquidity Harvester" config={engineConfigs.find(c => c.engine_id === 'scalper')} onToggle={(a: boolean) => toggleEngine('scalper', a)} />
                    <div className="bg-[#0E1B2A]/50 rounded-3xl border border-white/5 p-8 flex flex-col items-center justify-center text-center opacity-40">
                        <Cpu size={24} className="text-gray-600 mb-4" />
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Next Engine Slot</h3>
                        <p className="text-[9px] text-gray-600 font-bold uppercase mt-2">Custom Strategy API Coming Soon</p>
                    </div>
                </div>
            )}

            {activeTab === "logs" && (
                <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="text-[10px] text-teal font-black uppercase tracking-[0.3em] mb-1">Audit Trail</h3>
                            <h2 className="text-xl font-black text-white">Execution Logs</h2>
                        </div>
                        <span className="px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest">Live Stream</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-[10px] text-gray-600 uppercase tracking-widest bg-black/10">
                                    {["Time", "Action", "Instrument", "P/L"].map(h => (
                                        <th key={h} className={cn("px-6 py-4 font-black", h === "P/L" && "text-right")}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {history.map((log: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-gray-500 font-mono text-[11px]">{new Date(log.date).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", log.action?.includes('SELL') ? "bg-red-500" : "bg-teal")} />
                                                <span className="text-white font-black text-[10px] uppercase tracking-widest">{log.action || 'POSITION_ADJ'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 font-bold text-[11px] uppercase">{log.marketName || 'Capital.com'}</td>
                                        <td className={cn("px-6 py-4 text-right font-mono font-bold text-[11px]", log.amount >= 0 ? "text-teal" : "text-red-400")}>
                                            {log.amount >= 0 ? "+" : ""}{log.amount.toFixed(2)} {log.currency || 'USD'}
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-16 text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">No execution logs found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TradingPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-teal/20 border-t-teal rounded-full animate-spin" />
            </div>
        }>
            <TradingPageInner />
        </Suspense>
    );
}
