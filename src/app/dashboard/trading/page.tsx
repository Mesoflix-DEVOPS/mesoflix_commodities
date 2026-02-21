"use client";

import { useState } from "react";
import {
    BarChart3,
    Cpu,
    History,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    Zap,
    Scale,
    Activity,
    Maximized2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TradingPage() {
    const [activeTab, setActiveTab] = useState("manual");

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Sector Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-teal font-bold text-[10px] uppercase tracking-[0.3em] mb-2 px-1">Execution Hub</h2>
                    <h1 className="text-4xl font-black text-white tracking-tight">Trading Desk</h1>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-[#0A1622] p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    <TabButton active={activeTab === "manual"} onClick={() => setActiveTab("manual")} icon={BarChart3}>Manual</TabButton>
                    <TabButton active={activeTab === "engines"} onClick={() => setActiveTab("engines")} icon={Cpu}>Engine Control</TabButton>
                    <TabButton active={activeTab === "logs"} onClick={() => setActiveTab("logs")} icon={History}>Execution Logs</TabButton>
                </div>
            </div>

            {/* Trading Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-fit lg:h-[700px]">
                {/* Left: Chart Area */}
                <div className="lg:col-span-3 bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-8 flex flex-col shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                                <span className="text-white font-bold tracking-tight">GOLD (XAU/USD)</span>
                                <ChevronDown size={14} className="text-gray-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-white font-mono">1,942.20</span>
                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <TrendingUp size={10} /> +0.42%
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {["M1", "M5", "M15", "H1", "D1"].map(t => (
                                <button key={t} className={cn("px-3 py-1.5 text-[9px] font-black rounded-lg transition-all", t === "M15" ? "bg-teal/20 text-teal" : "text-gray-500 hover:text-white")}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Placeholder for Chart */}
                    <div className="flex-1 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-center relative group">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                        <div className="text-center">
                            <div className="w-20 h-20 bg-teal/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-teal/10 animate-pulse">
                                <Activity size={40} className="text-teal/20" />
                            </div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] leading-loose">
                                Rendering Real-time SVG Stream...<br />
                                <span className="text-teal/40">WebSocket Latency: 12ms</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Order Panel */}
                <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-8 flex flex-col shadow-2xl">
                    <div className="space-y-8">
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em] mb-4">Select Direction</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="py-4 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-dark-blue font-black rounded-2xl border border-green-500/20 transition-all flex flex-col items-center gap-2">
                                    <TrendingUp size={24} />
                                    <span>BUY</span>
                                </button>
                                <button className="py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-dark-blue font-black rounded-2xl border border-red-500/20 transition-all flex flex-col items-center gap-2">
                                    <TrendingDown size={24} />
                                    <span>SELL</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em] block px-1">Trade Parameters</label>

                            <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 font-bold">Trade Size (Lots)</span>
                                    <span className="text-white font-mono font-bold">0.50</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 font-bold">Risk Weight</span>
                                    <span className="text-teal font-bold">2.5%</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 space-y-4">
                            <button className="w-full py-5 bg-teal text-dark-blue font-black rounded-3xl hover:shadow-[0_0_30px_rgba(0,191,166,0.4)] transition-all flex items-center justify-center gap-3 tracking-widest">
                                <Zap size={18} fill="currentColor" />
                                EXECUTE TRADE
                            </button>
                            <p className="text-[9px] text-gray-600 text-center font-bold uppercase tracking-[0.1em]">Instant Market Execution Via Capital Bridge</p>
                        </div>
                    </div>

                    <div className="mt-auto pt-8 border-t border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <span>Available Liquidity</span>
                            <span className="text-white font-mono">$ --.--</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Orders & Positions Table */}
            <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-xl">
                <div className="p-8 border-b border-white/5 flex items-center gap-8">
                    <button className="text-sm font-black text-white border-b-2 border-teal pb-1 tracking-tight">Active Trades (2)</button>
                    <button className="text-sm font-black text-gray-500 hover:text-white transition-colors pb-1 tracking-tight">Pending Orders</button>
                    <button className="text-sm font-black text-gray-500 hover:text-white transition-colors pb-1 tracking-tight ml-auto flex items-center gap-2">
                        <Scale size={14} /> Full Portfolio
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-[10px] text-gray-600 uppercase tracking-widest bg-black/10">
                                <th className="px-8 py-5 font-black">Trade Details</th>
                                <th className="px-8 py-5 font-black">Contract</th>
                                <th className="px-8 py-5 font-black">Entry</th>
                                <th className="px-8 py-5 font-black">Current</th>
                                <th className="px-8 py-5 font-black text-right">Net P/L</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold">BUY 0.50 LOT</span>
                                        <span className="text-[9px] text-gray-600 font-bold uppercase mt-1">ID: #492810 • 14:22:15</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-gray-400 font-bold uppercase tracking-tight">GOLD (XAUUSD)</td>
                                <td className="px-8 py-6 font-mono text-gray-300">1,942.20</td>
                                <td className="px-8 py-6 font-mono text-white">1,948.42</td>
                                <td className="px-8 py-6 text-right">
                                    <span className="text-green-500 font-black font-mono text-lg">+$42.10</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, children }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest",
                active
                    ? "bg-teal text-dark-blue shadow-[0_0_20px_rgba(0,191,166,0.3)]"
                    : "text-gray-500 hover:text-white hover:bg-white/5"
            )}
        >
            <Icon size={14} />
            {children}
        </button>
    );
}
