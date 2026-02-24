"use client";

import { useEffect, useState, useCallback } from "react";
import { useMarketData } from "@/contexts/MarketDataContext";
import { cn } from "@/lib/utils";
import {
    PieChart, Target, TrendingUp, TrendingDown,
    Activity, Clock, RefreshCw, BarChart3
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, PieChart as RechartsPieChart,
    Pie, Cell, Legend
} from "recharts";

type Timeframe = '1W' | '1M' | '3M' | 'YTD' | 'ALL';

interface AnalyticsData {
    winRate: number;
    grossProfit: number;
    grossLoss: number;
    netProfit: number;
    totalTrades: number;
    wins: number;
    losses: number;
    equityCurve: { time: string; cumulative: number; pnl: number }[];
}

export default function AnalyticsPage() {
    const { mode } = useMarketData();
    const [timeframe, setTimeframe] = useState<Timeframe>('1M');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics?mode=${mode}&timeframe=${timeframe}`);
            if (res.ok) {
                const d = await res.json();
                setData(d);
            }
        } finally {
            setLoading(false);
        }
    }, [mode, timeframe]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            signDisplay: 'always'
        }).format(val);
    };

    const pieData = data ? [
        { name: "Winning Trades", value: data.wins, color: "#00BFA6" },
        { name: "Losing Trades", value: data.losses, color: "#F87171" }
    ] : [];

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-teal font-black text-[10px] uppercase tracking-[0.3em] mb-1">Performance Overview</h2>
                    <h1 className="text-3xl font-black text-white tracking-tight">Analytics Desk</h1>
                </div>

                <div className="flex bg-[#0A1622] p-1.5 rounded-2xl border border-white/5 self-start md:self-auto overflow-x-auto w-full md:w-auto scrollbar-hide">
                    {(['1W', '1M', '3M', 'YTD', 'ALL'] as Timeframe[]).map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 md:px-5 py-2 md:py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrapflex-shrink-0",
                                timeframe === tf
                                    ? "bg-teal text-dark-blue shadow-[0_0_15px_rgba(0,191,166,0.3)]"
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Clock size={12} className={timeframe === tf ? "text-dark-blue" : "text-gray-600"} />
                            {tf}
                        </button>
                    ))}
                    <button
                        onClick={fetchAnalytics}
                        className="ml-2 px-3 py-2 flex items-center justify-center text-gray-500 hover:text-white bg-white/5 rounded-xl transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin text-teal" : ""} />
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="w-10 h-10 border-4 border-teal/20 border-t-teal rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Crunching Market Data...</p>
                </div>
            ) : !data ? (
                <div className="h-48 flex items-center justify-center border border-white/5 rounded-3xl bg-[#0E1B2A]">
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Failed to load analytics</span>
                </div>
            ) : (
                <>
                    {/* Top Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            title="Net Profit"
                            value={formatCurrency(data.netProfit)}
                            icon={Activity}
                            color={data.netProfit >= 0 ? "text-teal" : "text-red-400"}
                            bg={data.netProfit >= 0 ? "bg-teal/10" : "bg-red-500/10"}
                            borderColor={data.netProfit >= 0 ? "border-teal/20" : "border-red-500/20"}
                        />
                        <StatCard
                            title="Win Rate"
                            value={`${data.winRate.toFixed(1)}%`}
                            icon={Target}
                            color={data.winRate >= 50 ? "text-teal" : data.winRate > 0 ? "text-amber-400" : "text-gray-400"}
                            bg={data.winRate >= 50 ? "bg-teal/10" : data.winRate > 0 ? "bg-amber-400/10" : "bg-white/5"}
                            borderColor={data.winRate >= 50 ? "border-teal/20" : data.winRate > 0 ? "border-amber-400/20" : "border-white/10"}
                        />
                        <StatCard
                            title="Gross Profit"
                            value={formatCurrency(data.grossProfit)}
                            icon={TrendingUp}
                            color="text-teal"
                            bg="bg-teal/10"
                            borderColor="border-teal/20"
                        />
                        <StatCard
                            title="Gross Loss"
                            value={formatCurrency(-data.grossLoss)}
                            icon={TrendingDown}
                            color="text-red-400"
                            bg="bg-red-500/10"
                            borderColor="border-red-500/20"
                        />
                    </div>

                    {/* Chart & Distribution Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* Equity Curve */}
                        <div className="xl:col-span-2 bg-[#0E1B2A] rounded-3xl border border-white/5 p-6 shadow-xl flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                                        <BarChart3 size={18} className="text-teal" />
                                        Equity Curve
                                    </h3>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Cumulative Net P/L over timeframe</p>
                                </div>
                                <div className="hidden sm:block text-right">
                                    <span className={cn("text-2xl font-black font-mono tracking-tight", data.netProfit >= 0 ? "text-teal" : "text-red-400")}>
                                        {formatCurrency(data.netProfit)}
                                    </span>
                                </div>
                            </div>

                            <div className="h-[300px] w-full mt-auto">
                                {data.equityCurve.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.equityCurve} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={data.netProfit >= 0 ? "#00BFA6" : "#F87171"} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={data.netProfit >= 0 ? "#00BFA6" : "#F87171"} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis
                                                dataKey="time"
                                                tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 900 }}
                                                axisLine={{ stroke: '#ffffff20' }}
                                                tickLine={false}
                                                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                minTickGap={30}
                                            />
                                            <YAxis
                                                tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 900, fontFamily: 'monospace' }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(v) => `$${v}`}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0A1622', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', fontWeight: 900 }}
                                                itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                                                labelStyle={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}
                                                formatter={(value: any) => [formatCurrency(Number(value) || 0), "Cumulative"]}
                                                labelFormatter={(label) => new Date(label).toLocaleString()}
                                            />
                                            <ReferenceLine y={0} stroke="#ffffff40" strokeDasharray="3 3" />
                                            <Area
                                                type="monotone"
                                                dataKey="cumulative"
                                                stroke={data.netProfit >= 0 ? "#00BFA6" : "#F87171"}
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorEq)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No trading activity in this timeframe</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Trade Distribution */}
                        <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 p-6 shadow-xl flex flex-col">
                            <div className="mb-4">
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    <PieChart size={18} className="text-teal" />
                                    Trade Accuracy
                                </h3>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Win vs Loss Distribution</p>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[250px]">
                                {data.totalTrades > 0 ? (
                                    <>
                                        {/* Center Label inside Pie */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Signals</span>
                                            <span className="text-3xl font-black text-white font-mono">{data.totalTrades}</span>
                                        </div>

                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsPieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={70}
                                                    outerRadius={95}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0A1622', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 900 }}
                                                    itemStyle={{ color: '#fff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                                    formatter={(value: any) => [value, "Trades"]}
                                                />
                                            </RechartsPieChart>
                                        </ResponsiveContainer>

                                        {/* Custom Legend */}
                                        <div className="w-full mt-4 flex justify-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-teal" />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{data.wins} <span className="text-gray-600">Wins</span></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{data.losses} <span className="text-gray-600">Losses</span></span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No signals executed</span>
                                )}
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bg, borderColor }: { title: string, value: string, icon: any, color: string, bg: string, borderColor: string }) {
    return (
        <div className={cn("bg-[#0E1B2A] rounded-3xl border p-5 transition-all hover:bg-white/[0.02]", borderColor)}>
            <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", bg, color)}>
                    <Icon size={16} />
                </div>
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</h3>
            </div>
            <p className={cn("text-2xl font-black font-mono tracking-tight", color)}>{value}</p>
        </div>
    );
}
