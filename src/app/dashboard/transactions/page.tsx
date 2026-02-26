"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useMarketData } from "@/contexts/MarketDataContext";
import { cn } from "@/lib/utils";
import { History, Clock, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";



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

export default function TransactionsPage() {
    const { mode } = useMarketData();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/transactions?mode=${mode}`);
            if (res.ok) {
                const d = await res.json();
                setTransactions(d.transactions || []);
            }
        } finally {
            setLoading(false);
        }
    }, [mode]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const formatCurrency = (val: number | null) => {
        if (val === null) return "—";
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            signDisplay: 'auto'
        }).format(val);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-teal font-black text-[10px] uppercase tracking-[0.3em] mb-1">Trade Ledger</h2>
                    <h1 className="text-3xl font-black text-white tracking-tight">Transactions</h1>
                </div>

                <div className="flex bg-[#0A1622] p-1.5 rounded-2xl border border-white/5 self-start overflow-x-auto w-full sm:w-auto scrollbar-hide gap-2">
                    <button
                        className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 bg-teal text-dark-blue shadow-[0_0_15px_rgba(0,191,166,0.3)] cursor-default"
                    >
                        <Clock size={12} className="text-dark-blue" />
                        Last 24 Hours
                    </button>

                    <Link
                        href="/dashboard/transactions/analytics"
                        className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
                    >
                        <TrendingUp size={12} className="text-teal" />
                        Analytics
                    </Link>

                    <button
                        onClick={fetchTransactions}
                        className="px-3 py-2 flex items-center justify-center text-gray-500 hover:text-white bg-white/5 rounded-xl transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin text-teal" : ""} />
                    </button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-[#0E1B2A] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <History size={18} className="text-teal" />
                            Closed Positions
                            <span className="ml-2 text-sm font-black text-gray-500">({transactions.length})</span>
                        </h3>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                        <div className="w-10 h-10 border-4 border-teal/20 border-t-teal rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Compiling ledger...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar overflow-y-auto max-h-[60vh]">
                        <table className="w-full text-left whitespace-nowrap relative">
                            <thead className="sticky top-0 z-10 bg-[#0E1B2A] shadow-md">
                                <tr className="text-[9px] text-gray-600 uppercase tracking-widest bg-black/10 border-b border-white/5">
                                    <th className="px-6 py-4 font-black">Date & Time</th>
                                    <th className="px-6 py-4 font-black">Instrument</th>
                                    <th className="px-6 py-4 font-black">Action</th>
                                    <th className="px-6 py-4 font-black">Size</th>
                                    <th className="px-6 py-4 font-black text-right">Net P/L</th>
                                    <th className="px-6 py-4 font-black text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactions.map((tx) => {
                                    const isExpanded = expandedRows[tx.id];
                                    return (
                                        <React.Fragment key={tx.id}>
                                            <tr
                                                className={cn("hover:bg-white/[0.02] transition-colors cursor-pointer group", isExpanded && "bg-white/[0.02]")}
                                                onClick={() => toggleRow(tx.id)}
                                            >
                                                <td className="px-6 py-4 text-[11px] font-mono text-gray-400">
                                                    {new Date(tx.date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-tight">{tx.epic}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn("px-2 py-1 flex max-w-fit items-center gap-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                        tx.direction === "BUY" ? "bg-teal/10 text-teal border border-teal/20" :
                                                            tx.direction === "SELL" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                                                "bg-white/5 text-gray-400 border border-white/10"
                                                    )}>
                                                        {tx.direction !== "—" && <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", tx.direction === "BUY" ? "bg-teal" : "bg-red-500")} />}
                                                        {tx.direction}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] font-mono text-gray-400">{tx.size ?? "—"}</td>
                                                <td className={cn("px-6 py-4 text-right font-mono font-black text-sm",
                                                    tx.pnl >= 0 ? "text-teal" : "text-red-400")}>
                                                    {tx.pnl >= 0 ? "+" : ""}{formatCurrency(tx.pnl)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="p-1.5 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-lg group-hover:bg-white/10">
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Expandable Details Row */}
                                            {isExpanded && (
                                                <tr className="bg-black/20 border-b-0">
                                                    <td colSpan={6} className="px-6 py-6 pb-8">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-in slide-in-from-top-2 duration-300">
                                                            <div>
                                                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Description</p>
                                                                <p className="text-[11px] font-bold text-gray-300 whitespace-normal">{tx.description}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Open Price</p>
                                                                <p className="text-[11px] font-mono text-gray-300">{tx.openPrice?.toFixed(4) || '—'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Close Price</p>
                                                                <p className="text-[11px] font-mono text-gray-300">{tx.closePrice?.toFixed(4) || '—'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Execution Channel</p>
                                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300 uppercase">
                                                                    <CheckCircle2 size={12} className="text-teal" />
                                                                    {tx.channel}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {transactions.length === 0 && (
                                    <tr><td colSpan={6} className="px-6 py-16 text-center text-[10px] font-black text-gray-600 uppercase tracking-widest">No closed trades found in the last 24 hours</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
