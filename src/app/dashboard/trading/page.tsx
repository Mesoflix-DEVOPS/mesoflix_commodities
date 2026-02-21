"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
    Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

function TradingPageInner() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode") || "demo";
    const [activeTab, setActiveTab] = useState("manual");
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [executing, setExecuting] = useState(false);
    const [size, setSize] = useState(0.50);
    const [engineConfigs, setEngineConfigs] = useState<any[]>([]);

    const fetchData = (isSilent = false) => {
        if (!isSilent) setLoading(true);

        // Parallel fetch for dashboard and engine settings
        Promise.all([
            fetch("/api/dashboard").then(res => res.json()),
            fetch("/api/engines").then(res => res.json())
        ])
            .then(([dashData, engData]) => {
                setData(dashData);
                setEngineConfigs(engData);
            })
            .catch((err) => console.error(err))
            .finally(() => {
                if (!isSilent) setLoading(false);
            });
    };

    const toggleEngine = async (engineId: string, isActive: boolean) => {
        try {
            const res = await fetch("/api/engines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    engine_id: engineId,
                    is_active: !isActive
                })
            });
            if (res.ok) fetchData(true);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 10000);
        return () => clearInterval(interval);
    }, []);

    const handleTrade = async (direction: 'BUY' | 'SELL') => {
        setExecuting(true);
        try {
            const res = await fetch("/api/trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    epic: "IX.D.GOLD.IFM.IP", // Hardcoded Gold for now as per mockup
                    direction,
                    size
                })
            });

            if (res.ok) {
                fetchData(true);
                alert(`${direction} Execution Successful`);
            } else {
                const err = await res.json();
                alert(`Execution Failed: ${err.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert("Network Error during execution");
        } finally {
            setExecuting(false);
        }
    };

    // Filter account based on mode
    const activeAccount = data?.accounts?.find((acc: any) =>
        mode === "real" ? acc.accountType === "LIVE" : acc.accountType === "DEMO"
    ) || data?.accounts?.[0] || {
        balance: { balance: 0, currency: "USD", available: 0 },
        accountId: ""
    };

    const activePositions = data?.positions?.filter((pos: any) =>
        pos.accountId === activeAccount.accountId
    ) || [];

    const history = data?.history || [];

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

            {/* Dynamic Tab Content */}
            {activeTab === "manual" && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-fit lg:min-h-[700px]">
                    {/* Left: Chart Area */}
                    <div className="lg:col-span-3 bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-8 flex flex-col shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                                    <span className="text-white font-bold tracking-tight">GOLD (XAU/USD)</span>
                                    <ChevronDown size={14} className="text-gray-500" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-lg font-black text-white font-mono">{activePositions[0]?.level || '1,942.20'}</span>
                                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                        <TrendingUp size={10} /> Live Market
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Chart Context */}
                        <div className="flex-1 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-center relative group min-h-[400px]">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                            <div className="text-center">
                                <div className="w-20 h-20 bg-teal/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-teal/10 animate-pulse">
                                    <Activity size={40} className="text-teal/20" />
                                </div>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] leading-loose">
                                    Rendering Real-time SVG Stream...<br />
                                    <span className="text-teal/40">Market Bridge Active</span>
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
                                    <button
                                        onClick={() => handleTrade('BUY')}
                                        disabled={executing}
                                        className="py-4 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-dark-blue font-black rounded-2xl border border-green-500/20 transition-all flex flex-col items-center gap-2 disabled:opacity-50"
                                    >
                                        <TrendingUp size={24} />
                                        <span>BUY</span>
                                    </button>
                                    <button
                                        onClick={() => handleTrade('SELL')}
                                        disabled={executing}
                                        className="py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-dark-blue font-black rounded-2xl border border-red-500/20 transition-all flex flex-col items-center gap-2 disabled:opacity-50"
                                    >
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
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={size}
                                            onChange={(e) => setSize(parseFloat(e.target.value))}
                                            className="bg-transparent text-right text-white font-mono font-bold w-20 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 space-y-4">
                                <button
                                    onClick={() => handleTrade('BUY')} // Default to buy for the main button
                                    disabled={executing}
                                    className="w-full py-5 bg-teal text-dark-blue font-black rounded-3xl hover:shadow-[0_0_30px_rgba(0,191,166,0.4)] transition-all flex items-center justify-center gap-3 tracking-widest disabled:opacity-50"
                                >
                                    <Zap size={18} fill="currentColor" />
                                    {executing ? "EXECUTING..." : "EXECUTE TRADE"}
                                </button>
                                <p className="text-[9px] text-gray-600 text-center font-bold uppercase tracking-[0.1em]">Instant Market Execution Via Capital Bridge</p>
                            </div>
                        </div>

                        <div className="mt-auto pt-8 border-t border-white/5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <span>Available Liquidity</span>
                                <span className="text-white font-mono">
                                    {activeAccount.balance.currency} {activeAccount.balance.available.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "engines" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    <EngineCard
                        id="vortex"
                        name="Vortex Prime"
                        description="Institutional Momentum Scalper"
                        config={engineConfigs.find(c => c.engine_id === 'vortex')}
                        onToggle={(active: boolean) => toggleEngine('vortex', active)}
                    />
                    <EngineCard
                        id="scalper"
                        name="Swift Scalper"
                        description="High-Frequency liquidity Harvester"
                        config={engineConfigs.find(c => c.engine_id === 'scalper')}
                        onToggle={(active: boolean) => toggleEngine('scalper', active)}
                    />
                    <div className="bg-[#0E1B2A]/50 rounded-[2.5rem] border border-white/5 p-8 flex flex-col items-center justify-center text-center opacity-40">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Cpu size={24} className="text-gray-600" />
                        </div>
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Next Engine Slot</h3>
                        <p className="text-[9px] text-gray-600 font-bold uppercase mt-2">Custom Strategy API Coming Soon</p>
                    </div>
                </div>
            )}

            {activeTab === "logs" && (
                <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="text-[10px] text-teal font-black uppercase tracking-[0.3em] mb-2">Audit Trail</h3>
                            <h2 className="text-2xl font-black text-white">Execution Logs</h2>
                        </div>
                        <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Live Stream Active
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-[10px] text-gray-600 uppercase tracking-widest bg-black/10">
                                    <th className="px-8 py-5 font-black">Time</th>
                                    <th className="px-8 py-5 font-black">Action</th>
                                    <th className="px-8 py-5 font-black">Instrument</th>
                                    <th className="px-8 py-5 font-black text-right">Impact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {history.map((log: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-6">
                                            <span className="text-gray-500 font-mono text-[11px]">{new Date(log.date).toLocaleString()}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-2 h-2 rounded-full",
                                                    log.action?.includes('SELL') ? 'bg-red-500' : 'bg-green-500'
                                                )} />
                                                <span className="text-white font-black uppercase text-[10px] tracking-widest">{log.action || 'POSITION_ADJ'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-gray-400 font-bold uppercase tracking-tight">{log.marketName || 'Capital.com Adj'}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={cn("font-mono font-bold", log.amount >= 0 ? 'text-green-500' : 'text-red-500')}>
                                                {log.amount >= 0 ? '+' : ''}{log.amount.toFixed(2)} {log.currency || 'USD'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                            No execution logs found in session
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Active Trades Table (only on manual/engines) */}
            {(activeTab === "manual" || activeTab === "engines") && (
                <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-xl">
                    <div className="p-8 border-b border-white/5 flex items-center gap-8">
                        <button className="text-sm font-black text-white border-b-2 border-teal pb-1 tracking-tight">Active Trades ({activePositions.length})</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-[10px] text-gray-600 uppercase tracking-widest bg-black/10">
                                    <th className="px-8 py-5 font-black">Trade Details</th>
                                    <th className="px-8 py-5 font-black">Contract</th>
                                    <th className="px-8 py-5 font-black">Entry</th>
                                    <th className="px-8 py-5 font-black text-right">Net P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activePositions.map((pos: any, idx: number) => (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{pos.direction} {pos.size} LOT</span>
                                                <span className="text-[9px] text-gray-600 font-bold uppercase mt-1">ID: {pos.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-gray-400 font-bold uppercase tracking-tight">{pos.symbol}</td>
                                        <td className="px-8 py-6 font-mono text-gray-300">{pos.level}</td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={cn("font-black font-mono text-lg", pos.upl >= 0 ? "text-green-500" : "text-red-500")}>
                                                {pos.upl >= 0 ? "+" : ""}{pos.upl.toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {activePositions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                            No active positions found in {mode} account
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function EngineCard({ id, name, description, config, onToggle }: any) {
    const isActive = config?.is_active || false;
    return (
        <div className={cn(
            "bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl transition-all duration-500 relative overflow-hidden group",
            isActive ? "border-teal/30 shadow-teal/5" : "hover:border-white/10"
        )}>
            <div className="absolute top-0 right-0 p-8">
                <div className={cn(
                    "w-3 h-3 rounded-full blur-[2px] animate-pulse",
                    isActive ? "bg-teal shadow-[0_0_10px_#00BFA6]" : "bg-gray-700"
                )} />
            </div>

            <div className="mb-10">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Cpu size={28} className={cn(isActive ? "text-teal" : "text-gray-500")} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight mb-2 uppercase">{name}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                    {description}
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <span>Performance</span>
                    <span className="text-green-500">+12.4%</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <span>Status</span>
                    <span className={cn(isActive ? "text-teal" : "text-gray-700")}>{isActive ? "OPERATIONAL" : "IDLE"}</span>
                </div>
            </div>

            <div className="mt-10">
                <button
                    onClick={() => onToggle(isActive)}
                    className={cn(
                        "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                        isActive
                            ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
                            : "bg-teal text-dark-blue hover:shadow-[0_0_20px_rgba(0,191,166,0.3)]"
                    )}
                >
                    {isActive ? "TERMINATE ENGINE" : "ACTIVATE ENGINE"}
                </button>
            </div>
        </div>
    );
}

export default function TradingPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-teal/20 border-t-teal rounded-full animate-spin"></div>
            </div>
        }>
            <TradingPageInner />
        </Suspense>
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
