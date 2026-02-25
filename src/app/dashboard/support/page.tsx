"use client";

import { useState, useEffect } from "react";
import { PlusCircle, MessageSquareWarning, Search, ChevronRight, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TicketStatus = "OPEN" | "PENDING" | "CLOSED" | "ESCALATED";
type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface Ticket {
    id: string;
    subject: string;
    category: string;
    status: TicketStatus;
    priority: TicketPriority;
    created_at: string;
}

export default function SupportHubPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"ACTIVE" | "CLOSED">("ACTIVE");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const res = await fetch("/api/support/tickets", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    if (data.tickets) {
                        setTickets(data.tickets);
                    }
                }
            } catch (err) {
                console.error("Failed to load secure tickets:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, []);

    const filteredTickets = tickets.filter(t =>
        (activeTab === "ACTIVE" ? t.status !== "CLOSED" : t.status === "CLOSED") &&
        (t.subject.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    );

    const getStatusColor = (status: TicketStatus) => {
        switch (status) {
            case "OPEN": return "text-teal bg-teal/10 border-teal/20";
            case "PENDING": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
            case "CLOSED": return "text-gray-400 bg-white/5 border-white/10";
            case "ESCALATED": return "text-red-500 bg-red-500/10 border-red-500/20";
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-teal/20 to-teal/5 rounded-xl border border-teal/20">
                            <MessageSquareWarning className="w-6 h-6 text-teal" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Support Center</h1>
                    </div>
                    <p className="text-gray-400 max-w-2xl">
                        Open a secure ticket to chat live with our institutional support team. Resolved tickets are permanently locked for your security.
                    </p>
                </div>
                <div className="flex shrink-0">
                    <Link
                        href="/dashboard/support/new"
                        className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal to-[#009b86] hover:from-[#00b39b] hover:to-teal text-white rounded-xl font-medium shadow-[0_0_20px_rgba(0,191,166,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,191,166,0.5)] overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                        <PlusCircle size={20} className="relative z-10" />
                        <span className="relative z-10">Open New Ticket</span>
                    </Link>
                </div>
            </div>

            {/* Quick Stats / Tabs */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="bg-[#0D1C2A] rounded-2xl border border-white/5 p-2 flex gap-2 overflow-x-auto w-full md:w-auto shrink-0 hide-scrollbar">
                    <button
                        onClick={() => setActiveTab("ACTIVE")}
                        className={cn(
                            "px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap",
                            activeTab === "ACTIVE" ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <AlertCircle size={18} />
                        Active Tickets
                        <span className="ml-2 bg-teal/20 text-teal text-xs py-0.5 px-2 rounded-full font-bold">
                            {tickets.filter(t => t.status !== "CLOSED").length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("CLOSED")}
                        className={cn(
                            "px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap",
                            activeTab === "CLOSED" ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <CheckCircle2 size={18} />
                        Closed Tickets
                    </button>
                </div>

                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search ticket subject or category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#0D1C2A] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-mono text-sm h-full"
                    />
                </div>
            </div>

            {/* Ticket List */}
            <div className="bg-[#0D1C2A] rounded-2xl border border-white/5 overflow-hidden">
                {loading ? (
                    <div className="py-24 text-center">
                        <div className="w-12 h-12 border-4 border-teal/20 border-t-teal rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400 font-mono text-sm">Loading secure tickets...</p>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="py-24 text-center px-4 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                            <Clock className="w-8 h-8 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No tickets found</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            {search
                                ? `No results for "${search}" in ${activeTab.toLowerCase()} tickets.`
                                : `You don't have any ${activeTab.toLowerCase()} support tickets.`}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredTickets.map((ticket, i) => (
                            <Link
                                href={`/dashboard/support/ticket/${ticket.id}`}
                                key={ticket.id}
                                className="block p-6 hover:bg-white/5 transition-colors group"
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-gray-500 text-xs tracking-wider uppercase">TKT-{ticket.id.padStart(5, '0')}</span>
                                            <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-bold border", getStatusColor(ticket.status))}>
                                                {ticket.status}
                                            </span>
                                            {ticket.priority === "URGENT" && (
                                                <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-500 border border-red-500/20 rounded-full font-bold uppercase tracking-wider">
                                                    Escalated
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-teal transition-colors">
                                            {ticket.subject}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                                {ticket.category}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                Opened {new Date(ticket.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-teal group-hover:border-teal group-hover:text-[#0A1622] transition-all text-gray-400">
                                            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
