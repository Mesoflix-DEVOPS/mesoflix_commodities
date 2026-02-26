"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, ShieldCheck, Target, TrendingUp, BarChart2, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutomation } from "@/contexts/AutomationContext";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// Mock Equity Curve Generation based on Engine ID to simulate realistic institutional tracking
const generateEquityCurve = (base: number) => {
    let equity = base;
    return Array.from({ length: 30 }).map((_, i) => {
        const volatility = base * 0.05;
        const drift = base * 0.005; // slight upward drift
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

const RECENT_TRADES = [
    { id: "TX-992", type: "LONG", price: "2,642.10", pnl: 450.20, duration: "45m", date: "2 mins ago" },
    { id: "TX-991", type: "SHORT", price: "2,645.80", pnl: 120.50, duration: "12m", date: "1 hr ago" },
    { id: "TX-990", type: "LONG", price: "2,638.20", pnl: -85.40, duration: "1h 15m", date: "3 hrs ago" },
    { id: "TX-989", type: "LONG", price: "2,630.50", pnl: 890.00, duration: "4h 20m", date: "Yesterday" },
    { id: "TX-988", type: "SHORT", price: "2,650.10", pnl: -210.30, duration: "30m", date: "Yesterday" },
];

export default function EngineAnalyticsPage({ params }: { params: Promise<{ commodity: string, engine: string }> }) {
    const resolvedParams = use(params);
    const { commodity, engine: engineId } = resolvedParams;
    const { engines } = useAutomation();

    // Attempt to pull live state. If not deployed, we still show the analytics but note it's historical.
    const deployment = engines[engineId];

    // Format presentation string
    const engineName = engineId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    const chartData = useMemo(() => generateEquityCurve(deployment?.allocatedCapital || 10000), [deployment?.allocatedCapital]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div>
                <Link href={`/dashboard/automation/${commodity}`} className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-6">
                    <ArrowLeft size={14} className="mr-2" /> Back to {commodity.toUpperCase()} Engines
                </Link>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-black text-white">{engineName}</h1>
                            {deployment ? (
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                    deployment.state === "Running" ? "bg-teal/10 text-teal border-teal/20" :
                                        deployment.state === "Paused" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                            "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                )}>
                                    LIVE: {deployment.state}
                                </span>
                            ) : (
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/5 text-gray-400 border border-white/10">
                                    Historical View (Not Deployed)
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Algorithmic Analytics Dashboard</p>
                    </div>

                    {deployment && (
                        <div className="bg-[#0A1622] rounded-2xl p-4 border border-white/5 text-right">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Allocated Capital</p>
                            <p className="text-2xl font-mono font-bold text-white">${deployment.allocatedCapital.toLocaleString()}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Win Rate", value: "68.4%", icon: Target, color: "text-teal" },
                    { label: "Profit Factor", value: "2.14", icon: TrendingUp, color: "text-teal" },
                    { label: "Max Drawdown", value: "-8.2%", icon: Activity, color: "text-red-400" },
                    { label: "Recovery Factor", value: "3.5", icon: ShieldCheck, color: "text-blue-400" },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#0A1622] rounded-3xl p-6 border border-white/5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-xl font-black text-white">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Chart */}
            <div className="bg-[#0A1622] rounded-3xl p-8 border border-white/5">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <BarChart2 className="text-teal" size={24} />
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Equity Curve</h2>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">30-Day Trajectory</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {['7D', '30D', '90D', '1Y'].map(tf => (
                            <button key={tf} className={cn(
                                "px-3 py-1 text-xs font-bold rounded-lg border transition-colors",
                                tf === '30D' ? "bg-white/10 text-white border-white/20" : "bg-transparent text-gray-500 border-transparent hover:text-white"
                            )}>
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00BFA6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#00BFA6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="date" stroke="#4b5563" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                            <YAxis
                                stroke="#4b5563"
                                fontSize={10}
                                tickFormatter={(value) => `$${value.toLocaleString()}`}
                                tickMargin={10}
                                axisLine={false}
                                tickLine={false}
                                domain={['dataMin - 500', 'dataMax + 500']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A1622', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                                itemStyle={{ color: '#00BFA6' }}
                                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
                            />
                            <Area type="monotone" dataKey="equity" stroke="#00BFA6" strokeWidth={3} fillOpacity={1} fill="url(#colorEq)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Trade History */}
            <div className="bg-[#0A1622] rounded-3xl p-8 border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                    <History className="text-teal" size={20} />
                    <h2 className="text-xl font-bold text-white tracking-tight">Recent Executions</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] uppercase font-bold text-gray-500 tracking-widest bg-white/[0.02] border-y border-white/5">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-xl">Trade ID</th>
                                <th className="px-6 py-4">Direction</th>
                                <th className="px-6 py-4">Entry Price</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right rounded-tr-xl">Net P/L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {RECENT_TRADES.map((trade, i) => (
                                <tr key={trade.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 font-mono text-gray-400">{trade.id}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-1 rounded text-[10px] font-bold tracking-widest",
                                            trade.type === "LONG" ? "bg-teal/10 text-teal" : "bg-red-500/10 text-red-500"
                                        )}>
                                            {trade.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono">${trade.price}</td>
                                    <td className="px-6 py-4 text-gray-400">{trade.duration}</td>
                                    <td className="px-6 py-4 text-gray-400">{trade.date}</td>
                                    <td className={cn(
                                        "px-6 py-4 font-mono font-bold text-right",
                                        trade.pnl >= 0 ? "text-teal" : "text-red-500"
                                    )}>
                                        {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
