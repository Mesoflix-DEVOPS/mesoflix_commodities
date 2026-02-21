"use client";

import { useEffect, useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    Zap,
    Shield,
    Clock,
    ArrowUpRight,
    Play,
    Pause,
    BarChart2,
    Activity,
    ChevronRight,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [greeting, setGreeting] = useState("");

    const fetchData = (isSilent = false) => {
        if (!isSilent) setLoading(true);
        fetch("/api/dashboard")
            .then(async (res) => {
                if (res.status === 200) {
                    const jsonData = await res.json();
                    setData(jsonData);
                }
            })
            .catch((err) => console.error(err))
            .finally(() => {
                if (!isSilent) setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 10000);

        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");

        return () => clearInterval(interval);
    }, []);

    const account = data?.accounts?.[0] || {
        balance: { balance: 0, currency: "USD", profitLoss: 0, available: 0 }
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-teal/20 border-t-teal rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gold font-bold text-[10px]">M</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-teal font-bold text-[10px] uppercase tracking-[0.3em] mb-2 px-1">Institutional Environment</h2>
                    <h1 className="text-4xl font-black text-white tracking-tight">Terminal Overview</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end text-right px-4 border-r border-white/10 hidden sm:flex">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Active Market</span>
                        <span className="text-xs font-bold text-white uppercase">Commodities / Spot</span>
                    </div>
                    <button className="bg-teal text-dark-blue px-6 py-2.5 rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(0,191,166,0.4)] transition-all flex items-center gap-2">
                        <Zap size={16} fill="currentColor" />
                        Quick Engine Trade
                    </button>
                </div>
            </div>

            {/* Section A: Account Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard
                    label="Portfolio Balance"
                    value={account.balance.balance}
                    currency={account.balance.currency}
                    trend={+2.4}
                    icon={Wallet}
                    color="teal"
                />
                <SummaryCard
                    label="Account Equity"
                    value={account.balance.balance + account.balance.profitLoss}
                    currency={account.balance.currency}
                    trend={-0.8}
                    icon={TrendingUp}
                    color="blue"
                />
                <SummaryCard
                    label="Margin Occupied"
                    value={0.00}
                    currency={account.balance.currency}
                    trend={0}
                    icon={Shield}
                    color="amber"
                />
                <SummaryCard
                    label="Liquidity Available"
                    value={account.balance.available}
                    currency={account.balance.currency}
                    trend={+1.2}
                    icon={Zap}
                    color="green"
                />
            </div>

            {/* Section B & C: Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Performance Graph Panel */}
                <div className="lg:col-span-2 bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-10 flex flex-col h-[450px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[100px] -mr-64 -mt-64 transition-all duration-1000 group-hover:bg-teal/10" />

                    <div className="flex justify-between items-start mb-10 relative z-10">
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Aggregate Performance</h3>
                            <p className="text-xs text-gray-400 mt-1">Relative equity growth across all active engines</p>
                        </div>
                        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                            {["1D", "1W", "1M", "1Y", "ALL"].map(t => (
                                <button key={t} className={cn("px-4 py-1.5 text-[10px] font-black rounded-xl transition-all tracking-widest", t === "1M" ? "bg-teal text-dark-blue shadow-[0_0_15px_rgba(0,191,166,0.3)]" : "text-gray-500 hover:text-white hover:bg-white/5")}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center border-t border-white/5 mt-auto relative z-10">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-teal/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-teal/10">
                                <BarChart2 size={32} className="text-teal/40" />
                            </div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em] leading-loose">
                                System Bridge Interfacing<br />
                                <span className="text-teal/40">Synthesizing Historical Data...</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section C: Active Trading Engines */}
                <div className="space-y-6 flex flex-col pt-2">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h3 className="text-[11px] font-black text-teal uppercase tracking-[0.3em] flex items-center gap-2">
                            <Activity size={14} className="animate-pulse" />
                            Engine Control
                        </h3>
                        <button className="text-[10px] text-gray-500 font-bold uppercase hover:text-white transition-colors">Manage All</button>
                    </div>

                    <EngineCard name="Commodity Vortex" status="Active" pnl={+142.40} risk="Low" />
                    <EngineCard name="Volatility Scalper" status="Paused" pnl={-12.20} risk="Medium" />
                    <EngineCard name="Asian Session Brain" status="Idle" pnl={0.00} risk="High" />

                    <button className="mt-auto w-full py-5 bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-3xl transition-all flex flex-col items-center justify-center gap-2 group">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-teal transition-colors">
                            <Zap size={16} />
                        </div>
                        <span className="text-[10px] font-black text-gray-500 group-hover:text-gray-300 uppercase tracking-widest transition-colors">Deploy New Engine</span>
                    </button>
                </div>
            </div>

            {/* Section D & E: Secondary Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                {/* Section D: Open Positions */}
                <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-xl">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white tracking-tight">Active Execution</h3>
                        <button className="flex items-center gap-2 text-[10px] text-teal font-black uppercase tracking-widest hover:text-gold transition-colors group">
                            Full Portfolio <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="text-[10px] text-gray-600 uppercase tracking-widest bg-black/10">
                                    <th className="px-8 py-5 font-black">Contract / Asset</th>
                                    <th className="px-8 py-5 font-black">Trade Size</th>
                                    <th className="px-8 py-5 font-black">Entry Spot</th>
                                    <th className="px-8 py-5 font-black text-right">P/L (Net)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-teal rounded-full"></div>
                                            <span className="font-bold text-white uppercase tracking-tight">GOLD (XAUUSD)</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-gray-400 font-medium">0.50 Standard</td>
                                    <td className="px-8 py-6 font-mono text-gray-300">1,942.20</td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="text-green-500 font-bold font-mono text-base">+$42.10</span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-white/[0.03] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <span className="font-bold text-white uppercase tracking-tight">OIL (CRUDEWTI)</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-gray-400 font-medium">1.00 Mini</td>
                                    <td className="px-8 py-6 font-mono text-gray-300">75.40</td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="text-red-500 font-bold font-mono text-base">-$12.80</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Section F: Activity Feed */}
                <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-10 h-full shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-white tracking-tight">Operation Logs</h3>
                        <Activity size={18} className="text-gray-700" />
                    </div>
                    <div className="space-y-8">
                        <ActivityItem icon={Zap} text="Engine 'Commodity Vortex' executed BUY execution on XAU/USD" time="2m ago" />
                        <ActivityItem icon={Shield} text="Risk Safeguard triggered: Adjusted stop-loss limits for CRUDEWTI" time="15m ago" />
                        <ActivityItem icon={Clock} text="Asia Session Brain scheduled deployment for 01:00 UTC" time="1h ago" />
                        <ActivityItem icon={User} text="System established primary bridge with Capital.com" time="2h ago" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, currency, trend, icon: Icon, color }: any) {
    const isPositive = trend >= 0;
    return (
        <div className="group bg-[#0E1B2A] p-8 rounded-[2.5rem] border border-white/5 transition-all duration-700 hover:border-teal/30 hover:bg-[#112338] relative overflow-hidden shadow-xl">
            {/* Ambient Background Gradient */}
            <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-[0.03] transition-all duration-700 group-hover:opacity-[0.08]",
                color === 'teal' ? 'bg-teal' : color === 'blue' ? 'bg-blue-500' : color === 'amber' ? 'bg-amber-500' : 'bg-green-500'
            )} />

            <div className="flex items-center justify-between mb-8">
                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 text-gray-500 group-hover:text-teal transition-colors group-hover:scale-110 duration-500">
                    <Icon size={24} strokeWidth={1.5} />
                </div>
                {trend !== 0 && (
                    <div className={cn("flex items-center text-[10px] font-black px-2.5 py-1 rounded-xl tracking-widest transition-all",
                        isPositive ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
                    )}>
                        {isPositive ? <ArrowUpRight size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em] mb-2">{label}</p>
            <h4 className="text-3xl font-black text-white font-mono tracking-tighter flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-gray-600">{currency}</span>
                {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>
        </div>
    );
}

function EngineCard({ name, status, pnl, risk }: any) {
    return (
        <div className="bg-[#0E1B2A] p-6 rounded-3xl border border-white/5 flex flex-col gap-6 group hover:bg-[#112338] hover:border-white/10 transition-all duration-500 shadow-lg">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 animate-pulse",
                        status === 'Active' ? 'bg-teal shadow-[0_0_10px_#00BFA6]' :
                            status === 'Paused' ? 'bg-amber-500' : 'bg-gray-700'
                    )} />
                    <div>
                        <h4 className="text-sm font-black text-white tracking-tight">{name}</h4>
                        <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-60",
                            status === 'Active' ? 'text-teal' : status === 'Paused' ? 'text-amber-500' : 'text-gray-500'
                        )}>{status}</p>
                    </div>
                </div>
                <button className={cn("p-3 rounded-2xl border transition-all duration-500",
                    status === 'Active'
                        ? 'bg-white/5 border-white/5 hover:bg-amber-500 hover:text-dark-blue hover:border-transparent'
                        : 'bg-teal text-dark-blue border-transparent hover:shadow-[0_0_15px_rgba(0,191,166,0.3)]'
                )}>
                    {status === 'Active' ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
            </div>

            <div className="flex justify-between items-end bg-black/10 p-4 rounded-2xl">
                <div>
                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest block mb-1">Session P/L</span>
                    <span className={cn("text-xl font-black font-mono tracking-tighter", pnl >= 0 ? "text-green-500" : "text-red-500")}>
                        {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest block mb-1.5">Risk Config</span>
                    <span className={cn("text-[9px] font-black px-3 py-1 rounded-full border tracking-[0.1em]",
                        risk === 'Low' ? 'text-teal border-teal/20 bg-teal/5' :
                            risk === 'Medium' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' :
                                'text-red-500 border-red-500/20 bg-red-500/5'
                    )}>{risk}</span>
                </div>
            </div>
        </div>
    );
}

function ActivityItem({ icon: Icon, text, time }: any) {
    return (
        <div className="flex gap-5 group">
            <div className="w-10 h-10 shrink-0 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center text-gray-600 group-hover:bg-teal/10 group-hover:text-teal group-hover:border-teal/20 transition-all duration-500">
                <Icon size={18} strokeWidth={1.5} />
            </div>
            <div className="flex-1 pb-2">
                <p className="text-xs text-gray-300 font-bold leading-relaxed tracking-tight group-hover:text-white transition-colors">{text}</p>
                <span className="text-[9px] text-gray-600 mt-1.5 block font-black uppercase tracking-widest">{time}</span>
            </div>
        </div>
    );
}

function User({ size, strokeWidth }: { size: number, strokeWidth: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}
