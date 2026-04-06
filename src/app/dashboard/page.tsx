"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
    Filter,
    XCircle,
    CheckCircle2,
    MinusCircle,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { Suspense } from "react";
import { useMarketData } from "@/contexts/MarketDataContext";

// ---------------------------------------------------------------------------
// Capital.com API field mappings
// Positions: { position: { dealId, direction, size, upl, limitLevel, level, ... }, market: { epic, instrumentName, streamingPricesAvailable } }
// Accounts:  { accountId, accountName, accountType, preferred, balance: { balance, deposit, profitLoss, available }, currency }
// History:   { activityHistory: [{ date, type, status, dealReference, description, details }] }
// ---------------------------------------------------------------------------

function DashboardPageInner() {
    const { mode, balanceData, positions: livePositions } = useMarketData();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [liveHistory, setLiveHistory] = useState<any[]>([]);
    const [bulkClosing, setBulkClosing] = useState(false);
    const [showBulkMenu, setShowBulkMenu] = useState(false);
    const [selectedTrade, setSelectedTrade] = useState<any>(null);
    const [closingTrade, setClosingTrade] = useState(false);
    const bulkMenuRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback((isSilent = false) => {
        if (!isSilent) setLoading(true);
        
        // Institutional Bridge: Fetch directly from the stable Render Backend (Port 443)
        const RENDER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
        };

        const token = getCookie('access_token');

        fetch(`${RENDER_URL}/api/dashboard?mode=${mode}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(async (res) => {
                if (res.ok) {
                    const jsonData = await res.json();
                    setData(jsonData);
                }
            })
            .catch((err) => console.error('[Dashboard Bridge] Fetch error:', err))
            .finally(() => {
                if (!isSilent) setLoading(false);
            });
    }, [mode]);

    useEffect(() => {
        fetchData();
    }, [fetchData, mode]);

    // Update liveHistory when positions change via Socket.io context
    useEffect(() => {
        if (!livePositions || livePositions.length === 0) return;

        setData((prev: any) => ({
            ...prev,
            positions: livePositions
        }));

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const tickData: any = { name: now };
        livePositions.forEach((p: any) => {
            const epic = p.market?.instrumentName || p.position?.epic || 'Unknown';
            const upl = p.position?.upl ?? 0;
            tickData[epic] = parseFloat(Number(upl).toFixed(2));
        });

        setLiveHistory(prev => {
            const newHistory = [...prev, tickData];
            return newHistory.slice(-50); // Keep last 50 data points
        });
    }, [livePositions]);

    // Handle outside click to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target as Node)) {
                setShowBulkMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCloseTrade = async () => {
        if (!selectedTrade?.dealId) return;
        setClosingTrade(true);
        try {
            const res = await fetch(`/api/trade?dealId=${selectedTrade.dealId}&mode=${mode}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    epic: selectedTrade.epic,
                    direction: selectedTrade.direction,
                    size: selectedTrade.size,
                    openPrice: selectedTrade.level,
                    pnl: selectedTrade.upl,
                })
            });
            if (res.ok) {
                // Refresh data immediately
                fetchData(true);
                setSelectedTrade(null);
            } else {
                const err = await res.json();
                alert(`Failed to close trade: ${err.error || 'Unknown error'}`);
            }
        } catch (e: any) {
            alert(`Error closing trade: ${e.message}`);
        } finally {
            setClosingTrade(false);
        }
    };

    const handleBulkClose = async (filter: 'all' | 'profit' | 'loss') => {
        const tradesToClose = positions.filter(p => {
            if (filter === 'all') return true;
            if (filter === 'profit') return p.upl > 0;
            if (filter === 'loss') return p.upl < 0;
            return false;
        });

        if (tradesToClose.length === 0) {
            alert(`No trades found for filter: ${filter}`);
            return;
        }

        if (!confirm(`Are you sure you want to close ${tradesToClose.length} trades (${filter})?`)) return;

        setBulkClosing(true);
        let successCount = 0;
        let failCount = 0;

        for (const trade of tradesToClose) {
            try {
                const res = await fetch(`/api/trade?dealId=${trade.dealId}&mode=${mode}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        epic: trade.epic,
                        direction: trade.direction,
                        size: trade.size,
                        openPrice: trade.level,
                        pnl: trade.upl,
                    })
                });
                if (res.ok) successCount++;
                else failCount++;
            } catch (e) {
                failCount++;
            }
        }

        alert(`Bulk close complete: ${successCount} succeeded, ${failCount} failed.`);
        fetchData(true);
        setBulkClosing(false);
        setShowBulkMenu(false);
    };

    // -----------------------------------------------------------------------
    // Account selection
    // Capital.com accountType is "CFD" for both demo and live accounts
    // The preferred account is the active one; alternatively filter by mode
    // -----------------------------------------------------------------------
    const accounts = data?.accounts || [];
    const activeAccount = accounts.find((a: any) =>
        mode === 'real'
            ? a.accountType === 'CFD' && !a.accountName?.toLowerCase().includes('demo')
            : a.accountName?.toLowerCase().includes('demo') || a.accountId?.toLowerCase().includes('demo')
    ) || accounts.find((a: any) => a.preferred) || accounts[0];

    // Use balance from context (polled every 5s) which is more reliable than one-off fetch
    const balance = {
        balance: balanceData?.balance ?? activeAccount?.balance?.balance ?? 0,
        deposit: balanceData?.deposit ?? activeAccount?.balance?.deposit ?? 0,
        profitLoss: balanceData?.profitLoss ?? activeAccount?.balance?.profitLoss ?? 0,
        available: balanceData?.availableToWithdraw ?? activeAccount?.balance?.available ?? 0,
        equity: balanceData?.equity ?? ((activeAccount?.balance?.balance ?? 0) + (activeAccount?.balance?.profitLoss ?? 0)),
        currency: activeAccount?.currency || activeAccount?.balance?.currency || 'USD',
    };

    // -----------------------------------------------------------------------
    // Positions
    // Capital.com response: { positions: [{ position: {...}, market: {...} }] }
    // -----------------------------------------------------------------------
    const rawPositions: any[] = data?.positions || [];
    const positions = rawPositions.map((p: any) => ({
        dealId: p.position?.dealId || '',
        epic: p.market?.epic || p.position?.epic || '',
        name: p.market?.instrumentName || p.position?.epic || 'Unknown',
        direction: p.position?.direction || 'BUY',
        size: p.position?.size ?? 0,
        level: p.position?.level ?? 0,         // entry price
        upl: p.position?.upl ?? 0,             // unrealised P&L
        currency: p.position?.currency || balance.currency,
    }));

    // -----------------------------------------------------------------------
    // History Chart
    // Capital.com activityHistory items: { date, type (e.g. POSITION, SYSTEM), details: { actions: [{actionType, affectedDeals:[{profit,...}]}] } }
    // Build running equity line from the last N activities
    // -----------------------------------------------------------------------
    const rawHistory: any[] = data?.history || [];
    const profitEvents = rawHistory
        .filter((h: any) => h.details?.actions?.some((a: any) => a.affectedDeals?.length > 0))
        .slice(0, 20)
        .reverse();

    let runningEquity = balance.balance;
    const performanceData = profitEvents.length > 2
        ? profitEvents.map((h: any) => {
            const totalProfit = h.details.actions.reduce((sum: number, action: any) => {
                return sum + (action.affectedDeals || []).reduce((s: number, d: any) => s + (d.profit ?? 0), 0);
            }, 0);
            runningEquity += totalProfit;
            return {
                name: new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                equity: parseFloat(runningEquity.toFixed(2)),
            };
        })
        : [
            { name: 'Open', equity: balance.balance },
            { name: 'Mid', equity: balance.balance + ((balance.equity - balance.balance) / 2) }, // Interpolate an intermediate point so it curves
            { name: 'Now', equity: balance.equity },
        ];

    // -----------------------------------------------------------------------
    // Risk / Asset Exposure from open positions
    // -----------------------------------------------------------------------
    const assetExposure: Record<string, number> = {};
    positions.forEach((p) => {
        const sym = p.name || p.epic;
        assetExposure[sym] = (assetExposure[sym] || 0) + Math.abs(p.upl);
    });
    const COLORS = ['#00BFA6', '#3b82f6', '#f59e0b', '#ef4444', '#a78bfa'];
    const riskByAsset = Object.keys(assetExposure).length > 0
        ? Object.entries(assetExposure).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
        : [{ name: 'No Exposure', value: 1, color: '#1f2937' }];

    // -----------------------------------------------------------------------
    // Live Chart Formatting
    // -----------------------------------------------------------------------
    const activeEpics = useMemo(() => {
        const epics = new Set<string>();
        liveHistory.forEach(tick => {
            Object.keys(tick).forEach(k => {
                if (k !== 'name') epics.add(k);
            });
        });
        return Array.from(epics);
    }, [liveHistory]);
    const lineColors = ['#00BFA6', '#3b82f6', '#f59e0b', '#ef4444', '#a78bfa', '#ec4899', '#8b5cf6', '#14b8a6'];

    // -----------------------------------------------------------------------
    // Recent Activity from history
    // -----------------------------------------------------------------------
    const recentActivity = rawHistory.slice(0, 5).map((h: any) => ({
        type: h.type || 'EVENT',
        desc: h.description || (h.details?.actions?.[0]?.actionType) || 'Account activity',
        date: h.date ? new Date(h.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
        profit: h.details?.actions?.reduce((s: number, a: any) =>
            s + (a.affectedDeals || []).reduce((ss: number, d: any) => ss + (d.profit ?? 0), 0), 0) ?? null,
    }));

    // -----------------------------------------------------------------------
    // Stats
    // -----------------------------------------------------------------------
    const totalPnL = positions.reduce((s, p) => s + p.upl, 0);
    const winPositions = positions.filter(p => p.upl >= 0).length;
    const lossPositions = positions.filter(p => p.upl < 0).length;

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
                        <span className="text-xs font-bold text-white uppercase">{mode === 'real' ? 'Live Capital' : 'Demo Sandbox'}</span>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        positions.length > 0 ? 'text-teal border-teal/30 bg-teal/10' : 'text-gray-500 border-white/10 bg-white/5'
                    )}>
                        {positions.length} Live Position{positions.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Section A: Account Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard
                    label="Portfolio Balance"
                    value={balance.balance}
                    currency={balance.currency}
                    trend={balance.profitLoss !== 0 && balance.balance > 0 ? parseFloat(((balance.profitLoss / balance.balance) * 100).toFixed(2)) : 0}
                    icon={Wallet}
                    color="teal"
                />
                <SummaryCard
                    label="Account Equity"
                    value={balance.equity}
                    currency={balance.currency}
                    trend={0}
                    icon={TrendingUp}
                    color="blue"
                />
                <SummaryCard
                    label="Margin Used"
                    value={balance.deposit}
                    currency={balance.currency}
                    trend={0}
                    icon={Shield}
                    color="amber"
                />
                <SummaryCard
                    label="Available Funds"
                    value={balance.available}
                    currency={balance.currency}
                    trend={0}
                    icon={Zap}
                    color="green"
                />
            </div>

            {/* Section B: Performance Chart + Live P&L Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-10 flex flex-col h-[420px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[100px] -mr-64 -mt-64 transition-all duration-1000 group-hover:bg-teal/10" />

                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Live P/L Trajectory</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {activeAccount?.accountName || (mode === 'real' ? 'Live Account' : 'Demo Account')} — real-time curves per asset
                            </p>
                        </div>
                        <div className={cn("text-right px-4 py-2 rounded-2xl border",
                            totalPnL >= 0 ? 'border-teal/20 bg-teal/5' : 'border-red-500/20 bg-red-500/5'
                        )}>
                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-0.5">Open P/L</span>
                            <span className={cn("text-lg font-black font-mono", totalPnL >= 0 ? 'text-teal' : 'text-red-500')}>
                                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="h-[280px] min-h-[280px] w-full relative z-10 min-w-0">
                        <ResponsiveContainer width="100%" height="100%" debounce={100}>
                            <LineChart data={liveHistory.length > 0 ? liveHistory : [{ name: 'Now', equity: 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 'bold' }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A1622', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#9ca3af', marginBottom: '4px', fontSize: '10px' }}
                                    formatter={(value: any, name: any) => {
                                        if (name === 'equity') return null; // hide fallback
                                        return [`$${Number(value).toFixed(2)}`, name];
                                    }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                {activeEpics.length > 0 ? activeEpics.map((epic, i) => (
                                    <Line
                                        key={epic}
                                        type="monotone"
                                        dataKey={epic}
                                        stroke={lineColors[i % lineColors.length]}
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                        connectNulls={true}
                                        isAnimationActive={false}
                                    />
                                )) : (
                                    <Line type="monotone" dataKey="equity" stroke="#4b5563" strokeWidth={1} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Section C: Quick Stats + Activity */}
                <div className="space-y-4 flex flex-col">
                    {/* Win/Loss/Open stats */}
                    <div className="bg-[#0E1B2A] p-6 rounded-3xl border border-white/5 shadow-lg">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-5">Session Snapshot</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Positions Open', value: positions.length, color: 'text-white' },
                                { label: 'Profitable', value: winPositions, color: 'text-teal' },
                                { label: 'At Loss', value: lossPositions, color: 'text-red-500' },
                                {
                                    label: 'Win Rate', color: positions.length > 0 ? 'text-teal' : 'text-gray-500',
                                    value: positions.length > 0 ? `${((winPositions / positions.length) * 100).toFixed(0)}%` : '—'
                                },
                                { label: 'Deposit (Margin)', value: `${balance.currency} ${balance.deposit.toFixed(2)}`, color: 'text-amber-400' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{label}</span>
                                    <span className={cn("text-sm font-black font-mono", color)}>{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="flex-1 bg-[#0E1B2A] p-6 rounded-3xl border border-white/5 shadow-lg overflow-hidden">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                            <Clock size={12} /> Recent Activity
                        </h3>
                        {recentActivity.length > 0 ? (
                            <div className="space-y-4">
                                {recentActivity.map((item, i) => (
                                    <div key={i} className="flex items-start gap-3 group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 shrink-0 group-hover:shadow-[0_0_8px_#00BFA6]" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-gray-300 leading-tight truncate">{item.desc}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] text-gray-600 font-black uppercase">{item.date}</span>
                                                {item.profit !== null && item.profit !== 0 && (
                                                    <span className={cn("text-[9px] font-black", item.profit >= 0 ? 'text-teal' : 'text-red-500')}>
                                                        {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest shrink-0">{item.type}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">No recent activity</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section D + E: Positions Table + Risk Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
                {/* Active Positions Table */}
                <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-xl lg:col-span-2 flex flex-col h-[350px] sm:h-[400px] md:h-[450px]">
                    <div className="p-5 md:p-6 border-b border-white/5 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="text-base font-bold text-white tracking-tight">Active Execution</h3>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">{mode} account</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {positions.length > 0 && (
                                <div className="relative" ref={bulkMenuRef}>
                                    <button
                                        onClick={() => setShowBulkMenu(!showBulkMenu)}
                                        disabled={bulkClosing}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group scale-95 md:scale-100"
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest text-teal group-hover:text-white transition-colors">Close Positions</span>
                                        <ChevronDown size={12} className={cn("text-gray-500 transition-transform duration-300", showBulkMenu && "rotate-180")} />
                                    </button>

                                    {showBulkMenu && (
                                        <div className="absolute right-0 mt-3 w-44 bg-[#0F1D2F]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-200 z-[70]">
                                            <button
                                                onClick={() => handleBulkClose('all')}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/5 rounded-xl transition-all"
                                            >
                                                <XCircle size={13} className="text-red-400" />
                                                All Positions
                                            </button>
                                            <button
                                                onClick={() => handleBulkClose('profit')}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-teal hover:bg-teal/5 rounded-xl transition-all"
                                            >
                                                <CheckCircle2 size={13} />
                                                Profits Only
                                            </button>
                                            <button
                                                onClick={() => handleBulkClose('loss')}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                                            >
                                                <MinusCircle size={13} />
                                                Losses Only
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                                positions.length > 0 ? 'text-teal border-teal/30 bg-teal/10' : 'text-gray-600 border-white/10'
                            )}>
                                {positions.length} Open
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="text-[9px] text-gray-600 uppercase tracking-widest bg-black/10">
                                        <th className="px-4 py-3 font-black">Asset</th>
                                        <th className="px-4 py-3 font-black">Direction</th>
                                        <th className="px-4 py-3 font-black">Size</th>
                                        <th className="px-4 py-3 font-black">Entry</th>
                                        <th className="px-4 py-3 font-black text-right">Unreal. P/L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((pos, idx) => (
                                        <tr key={idx}
                                            onClick={() => setSelectedTrade(pos)}
                                            className="border-b border-white/5 hover:bg-white/[0.05] cursor-pointer transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 group-hover:scale-125 transition-transform", pos.direction === 'BUY' ? 'bg-teal' : 'bg-red-500')} />
                                                    <span className="font-bold text-white uppercase tracking-tight text-[13px]">{pos.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-lg tracking-widest",
                                                    pos.direction === 'BUY' ? 'text-teal bg-teal/10' : 'text-red-400 bg-red-500/10'
                                                )}>{pos.direction}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 font-bold font-mono text-xs">{pos.size}</td>
                                            <td className="px-4 py-3 font-mono text-gray-300 text-xs">{Number(pos.level).toFixed(4)}</td>
                                            <td className="px-4 py-3 text-right relative">
                                                <span className={cn("font-black font-mono text-sm", pos.upl >= 0 ? "text-teal" : "text-red-500")}>
                                                    {pos.upl >= 0 ? "+" : ""}{Number(pos.upl).toFixed(2)}
                                                </span>
                                                {/* Hover indicator */}
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ChevronRight size={14} className="text-gray-500" />
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {positions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-16 text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                                No active positions on the {mode} account
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Section E: Risk Pie Chart */}
                <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-6 md:p-8 shadow-xl flex flex-col h-[300px] sm:h-[350px] md:h-[450px]">
                    <h3 className="text-[10px] font-black text-teal uppercase tracking-[0.2em] mb-4 flex items-center gap-2 px-1">
                        <Shield size={14} /> Risk Analysis
                    </h3>

                    <div className="flex-1 flex flex-col items-center justify-center p-2 bg-white/5 rounded-[2rem] relative min-h-[150px] min-w-0 overflow-hidden">
                        <ResponsiveContainer width="100%" height={150} minWidth={1}>
                            <RePieChart>
                                <Pie
                                    data={riskByAsset}
                                    innerRadius={35}
                                    outerRadius={50}
                                    paddingAngle={4}
                                    dataKey="value"
                                    animationDuration={1000}
                                >
                                    {riskByAsset.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A1622', border: '1px solid #ffffff10', borderRadius: '10px' }}
                                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                    formatter={(v: any) => [`${Number(v).toFixed(2)}`, 'P/L Exposure']}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-1">
                            <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Exposure</span>
                        </div>
                    </div>

                    {/* Legend */}
                    {positions.length > 0 && (
                        <div className="mt-5 space-y-2">
                            {riskByAsset.slice(0, 5).map((r) => (
                                <div key={r.name} className="flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                                    <span className="text-[10px] text-gray-400 font-bold flex-1 truncate">{r.name}</span>
                                    <span className="text-[10px] font-black text-gray-500 font-mono">{r.value.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {positions.length === 0 && (
                        <p className="text-center text-[10px] text-gray-600 font-black uppercase tracking-widest mt-4">No open positions</p>
                    )}
                </div>
            </div>

            {/* Trade Details Modal */}
            {selectedTrade && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedTrade(null)}>
                    <div className="bg-[#0A1622] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedTrade(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border",
                                selectedTrade.direction === 'BUY' ? 'bg-teal/10 border-teal/20 text-teal' : 'bg-red-500/10 border-red-500/20 text-red-400'
                            )}>
                                {selectedTrade.direction === 'BUY' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">{selectedTrade.name}</h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{selectedTrade.epic}</p>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Direction</span>
                                <span className={cn("text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md",
                                    selectedTrade.direction === 'BUY' ? 'text-teal bg-teal/10' : 'text-red-400 bg-red-400/10'
                                )}>{selectedTrade.direction}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Size</span>
                                <span className="text-sm font-mono font-bold text-white">{selectedTrade.size} Lots</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Entry Price</span>
                                <span className="text-sm font-mono font-bold text-gray-300">{Number(selectedTrade.level).toFixed(4)}</span>
                            </div>
                            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Live P/L</span>
                                <span className={cn("text-xl font-mono font-black", selectedTrade.upl >= 0 ? "text-teal" : "text-red-500")}>
                                    {selectedTrade.upl >= 0 ? "+" : ""}{Number(selectedTrade.upl).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleCloseTrade}
                            disabled={closingTrade}
                            className={cn("w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                                closingTrade ? "bg-red-500/50 text-white cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                            )}
                        >
                            {closingTrade ? 'Closing...' : 'Close Trade Now'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-teal/20 border-t-teal rounded-full animate-spin"></div>
            </div>
        }>
            <DashboardPageInner />
        </Suspense>
    );
}

function SummaryCard({ label, value, currency, trend, icon: Icon, color }: any) {
    const isPositive = trend >= 0;
    const numValue = typeof value === 'number' ? value : 0;
    return (
        <div className="group bg-[#0E1B2A] p-8 rounded-[2.5rem] border border-white/5 transition-all duration-700 hover:border-teal/30 hover:bg-[#112338] relative overflow-hidden shadow-xl">
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
                <span className="text-sm font-bold text-gray-600">{currency || 'USD'}</span>
                {numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
        </div>
    );
}
