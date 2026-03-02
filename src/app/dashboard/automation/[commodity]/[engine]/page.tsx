"use client";

import { use, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, ShieldCheck, Target, TrendingUp, BarChart2, History, Play, Pause, Square, AlertTriangle, Shield, Gauge, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutomation, EngineState } from "@/contexts/AutomationContext";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const generateEquityCurve = (base: number) => {
    let equity = base;
    return Array.from({ length: 30 }).map((_, i) => {
        const volatility = base * 0.05;
        const drift = base * 0.005;
        const change = (Math.random() - 0.45) * volatility + drift;
        equity += change;
        const d = new Date();
        d.setDate(d.getDate() - (30 - i));
        return {
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            equity: Number(equity.toFixed(2))
        };
    });
};

export default function EngineAnalyticsPage({ params }: { params: Promise<{ commodity: string, engine: string }> }) {
    const resolvedParams = use(params);
    const { commodity, engine: engineId } = resolvedParams;
    const { engines, deployEngine, updateEngineState } = useAutomation();

    const deployment = engines[engineId];
    const engineName = engineId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    // Local State for Controls
    const [allocatedCapital, setAllocatedCapital] = useState(deployment?.allocatedCapital || 5000);
    const [targetProfit, setTargetProfit] = useState(deployment?.targetProfit || 100);
    const [dailyStopLoss, setDailyStopLoss] = useState(deployment?.dailyStopLoss || 250);
    const [riskLevel, setRiskLevel] = useState(deployment?.riskLevel || "Balanced");
    const [liveTrades, setLiveTrades] = useState<any[]>([]);

    useEffect(() => {
        if (deployment) {
            setAllocatedCapital(deployment.allocatedCapital);
            setTargetProfit(deployment.targetProfit);
            setDailyStopLoss(deployment.dailyStopLoss);
            setRiskLevel(deployment.riskLevel);
        }
    }, [deployment]);

    // Fetch Trades
    useEffect(() => {
        const fetchTrades = async () => {
            const res = await fetch(`/api/automation/trades?engine_id=${engineId}&mode=${deployment?.mode || 'demo'}`);
            if (res.ok) {
                const data = await res.json();
                setLiveTrades(data.trades || []);
            }
        };
        fetchTrades();
        const interval = setInterval(fetchTrades, 10000);
        return () => clearInterval(interval);
    }, [engineId]);

    const handleDeploy = () => {
        deployEngine({
            id: engineId,
            name: engineName,
            commodity,
            state: "Running",
            allocatedCapital,
            riskMultiplier: 1.0,
            stopLossCap: dailyStopLoss,
            targetProfit,
            dailyStopLoss,
            riskLevel,
            mode: "demo",
            pnl: 0
        });
    };

    const handleStop = () => updateEngineState(engineId, "Stopped");

    const chartData = useMemo(() => generateEquityCurve(allocatedCapital), [allocatedCapital]);

    // Calculate Metrics from liveTrades
    const metrics = useMemo(() => {
        if (liveTrades.length === 0) return { winRate: "0%", profitFactor: "0.0", totalTrades: 0, netPnl: 0 };
        const closedTrades = liveTrades.filter((t: any) => t.status === 'Closed' || t.close_price);
        const wins = closedTrades.filter((t: any) => parseFloat(t.pnl) > 0);
        const winRate = closedTrades.length > 0 ? ((wins.length / closedTrades.length) * 100).toFixed(1) + "%" : "0%";

        const grossProfit = closedTrades.filter((t: any) => parseFloat(t.pnl) > 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0);
        const grossLoss = Math.abs(closedTrades.filter((t: any) => parseFloat(t.pnl) < 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0));
        const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? "MAX" : "0.0") : (grossProfit / grossLoss).toFixed(2);

        const netPnl = liveTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0);

        return { winRate, profitFactor, totalTrades: liveTrades.length, netPnl };
    }, [liveTrades]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-24">
            {/* Header / Navigation */}
            <div>
                <Link href={`/dashboard/automation/${commodity}`} className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-6">
                    <ArrowLeft size={14} className="mr-2" /> Back to {commodity.toUpperCase()} Engines
                </Link>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-black text-white">{engineName}</h1>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                deployment?.state === "Running" ? "bg-teal/10 text-teal border-teal/20 animate-pulse" :
                                    deployment?.state === "Paused" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                        deployment?.state === "Target Achieved" ? "bg-teal text-black border-teal" :
                                            "bg-gray-500/10 text-gray-400 border-gray-500/20"
                            )}>
                                {deployment?.state || "Not Deployed"}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Aurum Velocity Hybrid Scalper</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* [ LEFT: CONTROL SETTINGS ] */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#0A1622] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Gauge size={120} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-2xl bg-teal/10 flex items-center justify-center border border-teal/20">
                                    <ShieldCheck className="text-teal" size={20} />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Control Settings</h3>
                            </div>

                            <div className="space-y-6">
                                {/* Capital Allocation */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Capital Allocation ($)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-teal" size={16} />
                                        <input
                                            type="number"
                                            value={allocatedCapital}
                                            onChange={(e) => setAllocatedCapital(Number(e.target.value))}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-teal/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Target Profit */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Target Profit ($)</label>
                                    <div className="relative">
                                        <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-teal" size={16} />
                                        <input
                                            type="number"
                                            value={targetProfit}
                                            onChange={(e) => setTargetProfit(Number(e.target.value))}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-teal/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Daily Stop Loss */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Daily Stop Loss Limit ($)</label>
                                    <div className="relative">
                                        <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={16} />
                                        <input
                                            type="number"
                                            value={dailyStopLoss}
                                            onChange={(e) => setDailyStopLoss(Number(e.target.value))}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-red-500/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Risk Level */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Risk Profile</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['Conservative', 'Balanced', 'Aggressive'].map(level => (
                                            <button
                                                key={level}
                                                onClick={() => setRiskLevel(level)}
                                                className={cn(
                                                    "py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border",
                                                    riskLevel === level ? "bg-teal border-teal text-black" : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                                                )}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 space-y-3">
                                    {deployment?.state === "Running" ? (
                                        <button
                                            onClick={handleStop}
                                            className="w-full bg-red-500 hover:bg-red-600 text-black font-black uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg"
                                        >
                                            <Square size={20} fill="currentColor" /> Emergency Stop
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleDeploy}
                                            className="w-full bg-teal hover:bg-teal/80 text-black font-black uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg"
                                        >
                                            <Play size={20} fill="currentColor" /> Deploy Engine
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* [ RIGHT: RESULTS & PERFORMANCE ] */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Live Status Box */}
                    <div className="bg-[#0A1622] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-teal uppercase tracking-[0.2em] mb-2">Live Engine State</p>
                                <div className="flex items-baseline gap-3">
                                    <h4 className="text-3xl font-black text-white uppercase">{deployment?.state || "OFFLINE"}</h4>
                                    <p className="text-sm font-bold text-gray-500 italic">“{deployment?.lastDecisionReason || "Awaiting sequence initialization..."}”</p>
                                </div>
                            </div>
                            <div className="h-12 w-px bg-white/5 hidden md:block" />
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Basket PNL</p>
                                <p className={cn(
                                    "text-3xl font-mono font-black",
                                    (deployment?.pnl || 0) >= 0 ? "text-teal" : "text-red-500"
                                )}>
                                    ${Number(deployment?.pnl || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* KPI Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Win Rate", value: metrics.winRate, icon: Target, color: "text-teal" },
                            { label: "Active Trades", value: metrics.totalTrades, icon: Activity, color: "text-white" },
                            { label: "Profit Factor", value: metrics.profitFactor, icon: TrendingUp, color: "text-teal" },
                            { label: "Risk Halted", value: "0", icon: Shield, color: "text-blue-400" },
                        ].map((stat, i) => (
                            <div key={i} className="bg-[#0A1622] rounded-3xl p-6 border border-white/5">
                                <stat.icon size={18} className={cn("mb-4", stat.color)} />
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-xl font-black text-white">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Performance History (Trade History) */}
                    <div className="bg-[#0A1622] rounded-[2.5rem] p-8 border border-white/5">
                        <div className="flex items-center gap-3 mb-8">
                            <History className="text-teal" size={20} />
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Execution Log</h3>
                        </div>

                        {/* Equity Chart */}
                        <div className="h-[280px] w-full mb-12 bg-white/[0.02] rounded-3xl p-6 border border-white/5 shadow-inner">
                            <ResponsiveContainer width="100%" height="100%" debounce={100}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00BFA6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00BFA6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 'bold' }}
                                    />
                                    <YAxis
                                        hide
                                        domain={['dataMin - 100', 'dataMax + 100']}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0A1622', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#9ca3af', marginBottom: '4px', fontSize: '10px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="equity"
                                        stroke="#00BFA6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorEquity)"
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase font-bold text-gray-500 tracking-widest bg-black/20 border-y border-white/5 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4">Trade ID</th>
                                        <th className="px-6 py-4">Entry</th>
                                        <th className="px-6 py-4">Size</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Net P/L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {liveTrades.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">No executions logged.</td>
                                        </tr>
                                    ) : (
                                        liveTrades.map((trade: any) => (
                                            <tr key={trade.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 font-mono text-gray-400">{trade.deal_id}</td>
                                                <td className="px-6 py-4 font-mono">${trade.open_price}</td>
                                                <td className="px-6 py-4 font-bold">{trade.size} Units</td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest",
                                                        trade.direction === "BUY" ? "bg-teal/10 text-teal" : "bg-red-500/10 text-red-500"
                                                    )}>
                                                        {trade.direction}
                                                    </span>
                                                </td>
                                                <td className={cn(
                                                    "px-6 py-4 font-mono font-bold text-right",
                                                    parseFloat(trade.pnl) >= 0 ? "text-teal" : "text-red-500"
                                                )}>
                                                    ${Number(trade.pnl).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
