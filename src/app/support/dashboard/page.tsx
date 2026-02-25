"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard, MessageSquare, Users, ShieldAlert, LogOut,
    Search, Filter, Clock, CheckCircle2, AlertCircle, Phone, MonitorPlay,
    Send, Paperclip, MoreVertical, ShieldCheck, FileText, Activity, Loader2, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import io, { Socket } from "socket.io-client";

// Mock typings for the 3-pane architecture
type QueueType = "UNASSIGNED" | "ASSIGNED" | "OPEN" | "ESCALATED" | "CLOSED";

interface TicketNode {
    id: string;
    subject: string;
    category: string;
    status: string;
    user_id: string;
    created_at: string;
    last_message?: string;
    unread?: boolean;
}

export default function AgentDashboard() {
    const router = useRouter();
    const [activeQueue, setActiveQueue] = useState<QueueType>("OPEN");
    const [tickets, setTickets] = useState<TicketNode[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<TicketNode | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState<string | null>(null);
    const [attachmentName, setAttachmentName] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch real ticket queue
    useEffect(() => {
        const fetchQueues = async () => {
            try {
                const res = await fetch("/api/support/agent/tickets");
                const data = await res.json();
                if (data.tickets) {
                    setTickets(data.tickets);
                }
            } catch (err) {
                console.error("Failed to load generic queue:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchQueues();

        // Connect global agent socket
        socketRef.current = io(window.location.origin, { path: "/api/socket" });
        return () => { socketRef.current?.disconnect(); };
    }, []);

    const handleSelectTicket = async (t: TicketNode) => {
        setSelectedTicket(t);

        try {
            const res = await fetch(`/api/support/tickets/${t.id}`);
            const data = await res.json();
            if (data.messages) {
                setChatMessages(data.messages);
            }
        } catch (e) {
            console.error(e);
        }

        // Join specific room
        socketRef.current?.emit('join_ticket', t.id);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("File size must be less than 2MB to ensure real-time delivery performance.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachment(reader.result as string);
            setAttachmentName(file.name);
        };
        reader.readAsDataURL(file);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !attachment) || !selectedTicket || sending) return;

        setSending(true);

        const payload = {
            id: `msg_${Date.now()}`,
            ticketId: selectedTicket.id,
            sender_type: "agent",
            message: input.trim(),
            attachment_url: attachment || undefined,
            created_at: new Date().toISOString()
        };

        setChatMessages(prev => [...prev, payload]);

        const outgoingInput = input.trim();
        const outgoingAttachment = attachment;

        setInput("");
        setAttachment(null);
        setAttachmentName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

        socketRef.current?.emit('send_message', payload);

        fetch(`/api/support/agent/tickets/${selectedTicket.id}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: outgoingInput, attachmentUrl: outgoingAttachment })
        })
            .catch(err => console.error("Message persist failed", err))
            .finally(() => setSending(false));
    };

    const handleLogout = () => {
        // Mock logout
        router.push("/support/login");
    };

    return (
        <div className="h-screen w-full flex bg-[#060D14] overflow-hidden">
            {/* 1. Left Sidebar - Global Nav */}
            <div className="w-16 h-full bg-[#0A1622] border-r border-white/5 flex flex-col items-center py-6 shrink-0 z-20">
                <div className="w-8 h-8 bg-gradient-to-br from-teal to-dark-blue rounded-xl flex items-center justify-center border border-white/10 mb-8">
                    <span className="text-white font-bold text-xs">A</span>
                </div>

                <div className="flex-1 space-y-4 w-full px-2">
                    <button className="w-full aspect-square flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                        <LayoutDashboard size={20} />
                    </button>
                    <button className="w-full aspect-square flex flex-col items-center justify-center gap-1 text-teal bg-teal/10 border border-teal/20 rounded-xl transition-colors relative">
                        <MessageSquare size={20} />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
                    <button className="w-full aspect-square flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                        <Users size={20} />
                    </button>
                </div>

                <button onClick={handleLogout} className="w-full aspect-square flex flex-col items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors mt-auto">
                    <LogOut size={20} />
                </button>
            </div>

            {/* 2. Queue Panel - Ticket List */}
            <div className="w-80 h-full bg-[#0A1622] border-r border-white/5 flex flex-col shrink-0 z-10">
                <div className="p-4 border-b border-white/5 space-y-4">
                    <h2 className="text-lg font-bold text-white tracking-tight">Support Queues</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            className="w-full bg-[#162B40] border border-white/5 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal/50 transition-all font-medium"
                        />
                    </div>
                    <div className="flex gap-2 text-xs font-medium">
                        <button onClick={() => setActiveQueue("OPEN")} className={cn("px-3 py-1.5 rounded-full transition-colors", activeQueue === "OPEN" ? "bg-teal/20 text-teal border border-teal/20" : "bg-white/5 text-gray-400 hover:text-white")}>Open (12)</button>
                        <button onClick={() => setActiveQueue("ESCALATED")} className={cn("px-3 py-1.5 rounded-full transition-colors", activeQueue === "ESCALATED" ? "bg-red-500/20 text-red-500 border border-red-500/20" : "bg-white/5 text-gray-400 hover:text-white")}>Escalated (3)</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-teal mx-auto" /></div>
                    ) : (
                        tickets.filter(t => activeQueue === "OPEN" ? t.status !== "CLOSED" : t.status === activeQueue).map(ticket => (
                            <button
                                key={ticket.id}
                                onClick={() => handleSelectTicket(ticket)}
                                className={cn(
                                    "w-full text-left p-4 border-b border-white/5 transition-colors hover:bg-white/5 relative",
                                    selectedTicket?.id === ticket.id && "bg-white/5 border-l-2 border-l-teal"
                                )}
                            >
                                {ticket.unread && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-teal shadow-[0_0_10px_#00BFA6]" />}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-mono text-gray-500 bg-black/40 px-2 py-0.5 rounded border border-white/5">TKT-{ticket.id}</span>
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10} /> 12m</span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-200 line-clamp-1 mb-1">{ticket.subject}</h4>
                                <p className="text-xs text-gray-500 line-clamp-2">{ticket.last_message}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-[9px] uppercase tracking-wider font-bold bg-[#162B40] text-gray-400 px-2 py-0.5 rounded-full">{ticket.category}</span>
                                    {ticket.status === "ESCALATED" && <span className="text-[9px] uppercase tracking-wider font-bold bg-red-500/20 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full">VIP SLA</span>}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* 3. Center Panel - Live Chat Center */}
            <div className="flex-1 flex flex-col bg-[#060D14] h-full relative z-0">
                {selectedTicket ? (
                    <>
                        <div className="h-[70px] border-b border-white/5 px-6 flex items-center justify-between shrink-0 bg-[#0A1622]/50 backdrop-blur-md z-10">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                                    {selectedTicket.subject}
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-teal/20 text-teal bg-teal/10">Connected</span>
                                </h2>
                                <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                    User ID: <span className="font-mono text-gray-400">{selectedTicket.user_id}</span> • Opened: {new Date(selectedTicket.created_at).toLocaleTimeString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="px-3 py-1.5 text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors">PENDING</button>
                                <button className="px-3 py-1.5 text-xs font-bold bg-white/5 text-gray-400 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">CLOSE TICKET</button>
                                <div className="w-px h-6 bg-white/10 mx-1" />
                                <button className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"><MoreVertical size={16} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                            {chatMessages.map((msg, idx) => {
                                const isAgent = msg.sender_type === "agent";
                                return (
                                    <div key={idx} className={cn("flex w-full", isAgent ? "justify-end" : "justify-start")}>
                                        <div className={cn(
                                            "max-w-[75%] rounded-2xl p-4 relative group",
                                            isAgent
                                                ? "bg-gradient-to-br from-teal to-[#009b86] text-white rounded-br-none shadow-lg"
                                                : "bg-[#162B40] border border-white/5 text-gray-100 rounded-bl-none"
                                        )}>
                                            {msg.attachment_url && (
                                                msg.attachment_url.startsWith("data:image/") ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={msg.attachment_url} alt="Attachment" className="max-w-full rounded-xl mb-3 border border-white/10 max-h-64 object-contain" />
                                                ) : (
                                                    <a href={msg.attachment_url} download="Secure_Document" className="flex items-center gap-3 p-3 bg-black/20 rounded-xl mb-3 hover:bg-black/30 transition-colors border border-white/5">
                                                        <div className="p-2 bg-white/10 rounded-lg shrink-0">
                                                            <FileText size={18} className="text-white" />
                                                        </div>
                                                        <span className="text-sm font-medium truncate pr-4 text-white underline">Secure_Document_Attached</span>
                                                    </a>
                                                )
                                            )}
                                            {msg.message && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>}
                                            <div className={cn(
                                                "mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono opacity-60",
                                                isAgent ? "justify-end text-white" : "justify-start text-gray-400"
                                            )}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-[#0A1622] border-t border-white/5 shrink-0 flex flex-col gap-3">
                            {attachment && (
                                <div className="flex items-center gap-3 bg-[#162B40] p-3 rounded-xl border border-teal/20 w-fit">
                                    {attachment.startsWith("data:image/") ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={attachment} alt="Preview" className="w-10 h-10 object-cover rounded bg-black/50" />
                                    ) : (
                                        <div className="w-10 h-10 bg-black/30 rounded flex items-center justify-center shrink-0">
                                            <FileText size={16} className="text-teal" />
                                        </div>
                                    )}
                                    <div className="flex flex-col mr-4 max-w-[200px]">
                                        <span className="text-xs font-bold text-white truncate">{attachmentName}</span>
                                        <span className="text-[10px] text-teal uppercase font-mono">Ready to Send</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAttachment(null);
                                            setAttachmentName(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-gray-500 hover:text-teal hover:bg-white/5 rounded-xl transition-all h-[52px]"
                                >
                                    <Paperclip size={20} />
                                </button>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Type a response to the user..."
                                    className="flex-1 bg-[#162B40] border border-white/5 rounded-xl px-4 h-[52px] text-white placeholder:text-gray-500 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={(!input.trim() && !attachment) || sending}
                                    className="px-6 h-[52px] bg-gradient-to-r from-teal to-[#009b86] hover:from-[#00b39b] hover:to-teal disabled:opacity-50 text-[#0A1622] rounded-xl font-bold flex items-center justify-center transition-all shadow-md group shrink-0"
                                >
                                    {sending ? <Loader2 size={20} className="animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                        <MessageSquare className="w-12 h-12 opacity-20" />
                        <p className="font-medium">Select a ticket from the queue to start responding.</p>
                    </div>
                )}
            </div>

            {/* 4. Right Sidebar - User Intelligence Panel */}
            <div className="w-80 h-full bg-[#0A1622] border-l border-white/5 flex flex-col shrink-0 z-10 overflow-y-auto scrollbar-hide">
                {selectedTicket ? (
                    <div className="p-6 space-y-8 animate-in slide-in-from-right-4 duration-500">
                        {/* Status Integrity Header */}
                        <div className="bg-[#162B40] border border-white/5 rounded-2xl p-4 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-5 h-5 text-teal" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Full KYC Verified</h3>
                                <p className="text-xs text-teal mt-0.5 flex items-center gap-1"><CheckCircle2 size={10} /> Tier 2 Authorization</p>
                            </div>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Activity size={12} /> Live Balance Pipeline</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#0D1C2A] border border-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Total Equity</p>
                                    <p className="text-lg font-bold text-white font-mono mt-1">$45,210.00</p>
                                    <span className="text-[10px] text-teal block mt-1">+1.2% today</span>
                                </div>
                                <div className="bg-[#0D1C2A] border border-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Available</p>
                                    <p className="text-lg font-bold text-white font-mono mt-1">$12,400.00</p>
                                    <span className="text-[10px] text-gray-500 block mt-1">Margin: 22%</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><MonitorPlay size={12} /> Recent Telemetry</h4>
                            <div className="bg-[#0D1C2A] border border-white/5 rounded-xl divide-y divide-white/5">
                                <div className="p-3 text-sm flex items-start gap-3">
                                    <div className="w-6 h-6 rounded bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 mt-0.5"><AlertCircle size={12} /></div>
                                    <div>
                                        <p className="font-bold text-gray-300">Deposit Failed</p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">Stripe Gateway: Blocked</p>
                                        <p className="text-[10px] text-gray-600 mt-1">12 mins ago</p>
                                    </div>
                                </div>
                                <div className="p-3 text-sm flex items-start gap-3">
                                    <div className="w-6 h-6 rounded bg-teal/10 text-teal flex items-center justify-center shrink-0 mt-0.5"><FileText size={12} /></div>
                                    <div>
                                        <p className="font-bold text-gray-300">Engine Configured</p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">Vortex AI updated limits</p>
                                        <p className="text-[10px] text-gray-600 mt-1">4 hours ago</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-4 border-t border-white/5">
                            <button className="w-full py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-colors">INITIATE ACCOUNT FREEZE</button>
                            <button className="w-full py-2.5 bg-[#162B40] text-white hover:bg-[#1E3A5F] rounded-xl text-xs font-bold transition-colors">VIEW FULL AUDIT LOG</button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 px-6 text-center">
                        <Users className="w-12 h-12 opacity-20" />
                        <p className="font-medium text-sm">User Intelligence Panel</p>
                        <p className="text-xs">Contextual data pipeline will initialize when a ticket is selected.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
