"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useMarketData } from "@/contexts/MarketDataContext";
import { ArrowLeft, TrendingUp, TrendingDown, Target, Activity, BarChart2 } from "lucide-react";
import Link from "next/link";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    Cell
} from "recharts";

interface Transaction {
    id: string;
    date: string;
    epic: string;
    direction: "BUY" | "SELL" | "—";
    size: number;
    openPrice: number | null;
    closePrice: number | null;
    pnl: number;
    description: string;
    channel: string;
}

export default function AnalyticsPage() {
    const { mode } = useMarketData();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/transactions?mode=${mode}`);
                if (res.ok) {
                    const d = await res.json();
                    // Sort oldest to newest for charts
                    const sorted = (d.transactions || []).reverse();
                    setTransactions(sorted);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, [mode]);

    // Derived Metrics
    const metrics = useMemo(() => {
        if (!transactions.length) return null;

        let totalPnL = 0;
        let winningTrades = 0;
        let losingTrades = 0;
        const assetMap: Record<string, { pnl: number, count: number }> = {};

        transactions.forEach(tx => {
            totalPnL += tx.pnl;
            if (tx.pnl > 0) winningTrades++;
            else if (tx.pnl < 0) losingTrades++;

            if (!assetMap[tx.epic]) {
                assetMap[tx.epic] = { pnl: 0, count: 0 };
            }
            assetMap[tx.epic].pnl += tx.pnl;
            assetMap[tx.epic].count += 1;
        });

        const totalTrades = winningTrades + losingTrades;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        let bestAsset = { epic: '-', pnl: -Infinity };
        Object.entries(assetMap).forEach(([epic, data]) => {
            if (data.pnl > bestAsset.pnl) {
                bestAsset = { epic, pnl: data.pnl };
            }
        });

        return {
            totalPnL,
            winRate,
            totalTrades,
            winningTrades,
            losingTrades,
            bestAsset: bestAsset.pnl !== -Infinity ? bestAsset : null,
            assetMap
        };
    }, [transactions]);

    // Chart Data Generation
    const chartData = useMemo(() => {
        const runningPnL: Record<string, number> = {};
        return transactions.map((tx, idx) => {
            const epic = tx.epic || 'Unknown';
            if (!runningPnL[epic]) {
                runningPnL[epic] = 0;
            }
            runningPnL[epic] += tx.pnl;

            return {
                name: `Trade ${idx + 1}`,
                date: new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                ...runningPnL // Spread the running PnL of all assets
            };
        });
    }, [transactions]);

    const uniqueEpics = useMemo(() => {
        if (!metrics) return [];
        return Object.keys(metrics.assetMap);
    }, [metrics]);

    const COLORS = ['#00BFA6', '#3b82f6', '#f59e0b', '#ef4444', '#a78bfa', '#ec4899', '#8b5cf6', '#14b8a6'];

    const assetChartData = useMemo(() => {
        if (!metrics) return [];
        return Object.entries(metrics.assetMap)
            .map(([epic, data]) => ({ epic, pnl: data.pnl }))
            .sort((a, b) => b.pnl - a.pnl);
    }, [metrics]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', signDisplay: 'auto' }).format(val);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-10">
            {/* Header & Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-teal font-black text-[10px] uppercase tracking-[0.3em] mb-1">Performance Intelligence</h2>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Link href="/dashboard/transactions" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        Analytics Overview
                    </h1>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="w-10 h-10 border-4 border-teal/20 border-t-teal rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Aggregating Metrics...</p>
                </div>
            ) : !metrics || transactions.length === 0 ? (
                <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 p-12 text-center text-gray-500">
                    <BarChart2 size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-lg text-gray-400">Not Enough Data</p>
                    <p className="text-sm">Complete at least one trade to start generating analytics.</p>
                </div>
            ) : (
                <>
                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Net PnL Card */}
                        <div className="bg-gradient-to-br from-[#0E1B2A] to-[#122438] p-5 rounded-3xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                {metrics.totalPnL >= 0 ? <TrendingUp size={48} className="text-teal" /> : <TrendingDown size={48} className="text-red-500" />}
                            </div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Net Realized P/L</p>
                            <h3 className={`text-2xl font-black ${metrics.totalPnL >= 0 ? 'text-teal' : 'text-red-400'}`}>
                                {formatCurrency(metrics.totalPnL)}
                            </h3>
                        </div>

                        {/* Win Rate Card */}
                        <div className="bg-[#0E1B2A] p-5 rounded-3xl border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Target size={48} className="text-blue-500" />
                            </div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Win Rate</p>
                            <h3 className="text-2xl font-black text-white">
                                {metrics.winRate.toFixed(1)}<span className="text-lg text-gray-400">%</span>
                            </h3>
                            <div className="w-full bg-white/5 h-1.5 mt-3 rounded-full overflow-hidden">
                                <div className="h-full bg-teal" style={{ width: `${metrics.winRate}%` }} />
                            </div>
                        </div>

                        {/* Total Trades Card */}
                        <div className="bg-[#0E1B2A] p-5 rounded-3xl border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Activity size={48} className="text-yellow-500" />
                            </div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Signals Ex.</p>
                            <h3 className="text-2xl font-black text-white">
                                {metrics.totalTrades}
                            </h3>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                                <span className="text-teal mr-2">{metrics.winningTrades} W</span>
                                <span className="text-red-400">{metrics.losingTrades} L</span>
                            </p>
                        </div>

                        {/* Best Asset Card */}
                        <div className="bg-[#0E1B2A] p-5 rounded-3xl border border-white/5 relative overflow-hidden">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Top Performing Asset</p>
                            <h3 className="text-xl font-black text-white uppercase truncate">
                                {metrics.bestAsset?.epic || '—'}
                            </h3>
                            <p className={`text-sm font-black mt-1 ${metrics.bestAsset && metrics.bestAsset.pnl >= 0 ? 'text-teal' : 'text-red-400'}`}>
                                {metrics.bestAsset ? formatCurrency(metrics.bestAsset.pnl) : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Charts Segment */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Cumulative PnL Curve */}
                        <div className="lg:col-span-2 bg-[#0E1B2A] rounded-3xl border border-white/5 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-white">Cumulative Performance</h3>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Rolling trajectory 24H per asset</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 0, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="date" stroke="#4b5563" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#4b5563" fontSize={10} tickFormatter={(value) => `$${value}`} tickMargin={10} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0A1622', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                                            itemStyle={{ color: '#fff' }}
                                            labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                        {uniqueEpics.map((epic, i) => (
                                            <Line
                                                key={epic}
                                                type="monotone"
                                                dataKey={epic}
                                                stroke={COLORS[i % COLORS.length]}
                                                strokeWidth={3}
                                                dot={false}
                                                activeDot={{ r: 6 }}
                                                connectNulls={true}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Asset Breakdown Chart */}
                        <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 p-6">
                            <h3 className="text-lg font-black text-white mb-1">Asset Breakdown</h3>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-6">P/L BY INSTRUMENT</p>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={assetChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                        <XAxis type="number" stroke="#4b5563" fontSize={10} tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} />
                                        <YAxis dataKey="epic" type="category" stroke="#9ca3af" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                            contentStyle={{ backgroundColor: '#0A1622', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                                            formatter={(value: any) => [formatCurrency(value), 'P/L']}
                                        />
                                        <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={24}>
                                            {assetChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#00BFA6' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
