"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard, MessageSquare, Users, ShieldAlert, LogOut,
    Search, Clock, CheckCircle2, AlertCircle, MonitorPlay,
    Send, Paperclip, MoreVertical, ShieldCheck, FileText, Activity, Loader2, X, GraduationCap, Zap, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import AcademyManagement from "@/components/support/AcademyManagement";

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
    onboarding_status?: string | null;
    meet_link?: string | null;
}

export default function AgentDashboard() {
    const router = useRouter();
    const [activeQueue, setActiveQueue] = useState<QueueType>("OPEN");
    const [tickets, setTickets] = useState<TicketNode[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<TicketNode | null>(null);
    const [chatMessages, setChatMessages] = useState<{ id: string; sender_type: string; message: string | null; attachment_url: string | null; created_at: string; }[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState<string | null>(null);
    const [attachmentName, setAttachmentName] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "users" | "academy" | "onboarding">("chat");
    const [showFreezeModal, setShowFreezeModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [isFreezing, setIsFreezing] = useState(false);

    // Mobile responsive state for chat panes
    const [mobileChatPane, setMobileChatPane] = useState<"QUEUE" | "CHAT" | "INTEL">("QUEUE");

    const [sysUsers, setSysUsers] = useState<{ id: string, email: string, full_name: string | null, created_at: string, last_login_at: string | null, role: string, two_factor_enabled: boolean | null }[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch real ticket queue and users
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [tickRes, userRes] = await Promise.all([
                    fetch("/api/support/agent/tickets", { cache: "no-store" }),
                    fetch("/api/support/agent/users", { cache: "no-store" })
                ]);

                const tickData = await tickRes.json();
                if (tickData.tickets) setTickets(tickData.tickets);

                const userData = await userRes.json();
                if (userData.users) setSysUsers(userData.users);
            } catch (err) {
                console.error("Failed to load generic queue or users:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        // Connect global agent SSE
        const connectSSE = () => {
            const es = new EventSource("/api/support/stream");
            eventSourceRef.current = es;

            es.onopen = () => {
                console.log("Connected to secure support stream");
            };

            es.addEventListener('new_message', (ev) => {
                try {
                    const data = JSON.parse(ev.data);
                    const incomingMsg = data.message;
                    if (!incomingMsg) return;

                    // Route message to active chat if it matches ticketId
                    // Note: We need a ref to access the *current* selectedTicket inside the event listener
                    // To avoid complex ref management here, we just use setState callback
                    setChatMessages((prev) => {
                        const exists = prev.find(m => m.id === incomingMsg.id);
                        if (exists) return prev;
                        return [...prev, incomingMsg];
                    });
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                } catch (e) {
                    console.error("Failed to parse SSE message", e);
                }
            });

            es.onerror = () => {
                console.warn("SSE stream error. Reconnecting...");
                es.close();
                setTimeout(connectSSE, 3000);
            };
        };

        connectSSE();

        return () => { eventSourceRef.current?.close(); };
    }, []);

    const handleSelectTicket = async (t: TicketNode) => {
        setSelectedTicket(t);
        setMobileChatPane("CHAT");

        try {
            const res = await fetch(`/api/support/tickets/${t.id}`);
            const data = await res.json();
            if (data.messages) {
                setChatMessages(data.messages);
            }
        } catch (e) {
            console.error(e);
        }
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
            attachment_url: attachment || null,
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

        fetch(`/api/support/agent/tickets/${selectedTicket.id}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: outgoingInput, attachmentUrl: outgoingAttachment })
        })
            .catch(err => console.error("Message persist failed", err))
            .finally(() => setSending(false));
    };

    const handleGenerateMeet = async () => {
        if (!selectedTicket || sending) return;
        setSending(true);

        const uniqueRoom = `mesoflix-ob-${selectedTicket.id.substring(0, 8)}`;
        const meetUrl = `https://meet.google.com/${uniqueRoom}`;

        const payload = {
            id: `msg_meet_${Date.now()}`,
            ticketId: selectedTicket.id,
            sender_type: "agent",
            message: `INSTITUTIONAL SESSION STARTING: Please join the professional onboarding session via this secure link: ${meetUrl}`,
            attachment_url: null,
            created_at: new Date().toISOString()
        };

        setChatMessages(prev => [...prev, payload]);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

        try {
            // Persist the message AND update ticket level meet_link
            await Promise.all([
                fetch(`/api/support/agent/tickets/${selectedTicket.id}/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: payload.message })
                }),
                fetch(`/api/support/agent/tickets/${selectedTicket.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ meet_link: meetUrl, onboarding_status: 'IN_PROGRESS' })
                })
            ]);
            
            // Refresh local state
            setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, meet_link: meetUrl, onboarding_status: 'IN_PROGRESS' } : t));
        } catch (err) {
            console.error("Meet link persist failed", err);
        } finally {
            setSending(false);
        }
    };

    const handleLogout = () => {
        // Mock logout
        router.push("/support/login");
    };

    return (
        <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-[#060D14] overflow-hidden">
            {/* 1. Global Nav */}
            <div className="w-full h-16 md:w-16 md:h-full bg-[#0A1622] border-b md:border-b-0 md:border-r border-white/5 flex flex-row md:flex-col items-center justify-between md:justify-start py-2 px-4 md:py-6 md:px-0 shrink-0 z-20">
                <div className="w-8 h-8 md:mb-8 bg-gradient-to-br from-teal to-dark-blue rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                    <span className="text-white font-bold text-xs">A</span>
                </div>

                <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-4 md:w-full md:px-2 flex-1 justify-center md:justify-start">
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className={cn("w-10 h-10 md:w-full md:aspect-square flex items-center justify-center rounded-xl transition-colors relative", activeTab === "dashboard" ? "text-teal bg-teal/10 border border-teal/20" : "text-gray-400 hover:text-white hover:bg-white/5")}
                    >
                        <LayoutDashboard size={20} />
                    </button>
                    <button
                        onClick={() => setActiveTab("chat")}
                        className={cn("w-10 h-10 md:w-full md:aspect-square flex items-center justify-center rounded-xl transition-colors relative", activeTab === "chat" ? "text-teal bg-teal/10 border border-teal/20" : "text-gray-400 hover:text-white hover:bg-white/5")}
                    >
                        <MessageSquare size={20} />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
                    <button
                        onClick={() => setActiveTab("users")}
                        className={cn("w-10 h-10 md:w-full md:aspect-square flex items-center justify-center rounded-xl transition-colors relative", activeTab === "users" ? "text-teal bg-teal/10 border border-teal/20" : "text-gray-400 hover:text-white hover:bg-white/5")}
                    >
                        <Users size={20} />
                    </button>
                    <button
                        onClick={() => setActiveTab("onboarding")}
                        className={cn("w-10 h-10 md:w-full md:aspect-square flex items-center justify-center rounded-xl transition-colors relative", activeTab === "onboarding" ? "text-teal bg-teal/10 border border-teal/20" : "text-gray-400 hover:text-white hover:bg-white/5")}
                    >
                        <Zap size={20} />
                        {tickets.some(t => t.onboarding_status === 'REQUESTED') && <div className="absolute top-2 right-2 w-2 h-2 bg-teal rounded-full animate-pulse" />}
                    </button>
                    <button
                        onClick={() => setActiveTab("academy")}
                        className={cn("w-10 h-10 md:w-full md:aspect-square flex items-center justify-center rounded-xl transition-colors relative", activeTab === "academy" ? "text-teal bg-teal/10 border border-teal/20" : "text-gray-400 hover:text-white hover:bg-white/5")}
                    >
                        <GraduationCap size={20} />
                    </button>
                </div>

                <button onClick={handleLogout} className="w-10 h-10 md:w-full md:aspect-square flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors md:mt-auto shrink-0">
                    <LogOut size={20} />
                </button>
            </div>

            {activeTab === "chat" && (
                <>
                    {/* 2. Queue Panel - Ticket List */}
                    <div className={cn("w-full md:w-80 h-full bg-[#0A1622] border-r border-white/5 flex-col shrink-0 z-10", mobileChatPane === "QUEUE" ? "flex" : "hidden md:flex")}>
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
                    <div className={cn("flex-1 flex-col bg-[#060D14] h-full relative z-0", mobileChatPane === "CHAT" ? "flex" : "hidden md:flex")}>
                        {selectedTicket ? (
                            <>
                                <div className="h-[70px] border-b border-white/5 px-2 md:px-6 flex items-center justify-between shrink-0 bg-[#0A1622]/50 backdrop-blur-md z-10">
                                    <div className="flex items-center gap-2 md:gap-4">
                                        <button onClick={() => setMobileChatPane("QUEUE")} className="p-2 md:hidden text-gray-400 hover:text-white"><LogOut className="w-5 h-5 rotate-180" /></button>
                                        <div>
                                            <h2 className="text-sm md:text-lg font-bold text-white flex items-center gap-2 md:gap-3 truncate max-w-[150px] md:max-w-[400px]">
                                                {selectedTicket.subject}
                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-teal/20 text-teal bg-teal/10 hidden md:inline-flex">Connected</span>
                                            </h2>
                                            <p className="text-[10px] md:text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                User ID: <span className="font-mono text-gray-400 truncate max-w-[80px] md:max-w-none">{selectedTicket.user_id}</span> • Opened: {new Date(selectedTicket.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 md:gap-3">
                                        <button onClick={() => setMobileChatPane("INTEL")} className="p-2 md:hidden text-teal bg-teal/10 rounded-lg border border-teal/20"><Activity size={16} /></button>
                                        <button className="hidden md:block px-3 py-1.5 text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors">PENDING</button>
                                        <button className="hidden md:block px-3 py-1.5 text-xs font-bold bg-white/5 text-gray-400 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">CLOSE TICKET</button>
                                        <div className="hidden md:block w-px h-6 bg-white/10 mx-1" />
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
                    <div className={cn("w-full md:w-80 h-full bg-[#0A1622] md:border-l border-white/5 flex-col shrink-0 z-10 overflow-y-auto scrollbar-hide", mobileChatPane === "INTEL" ? "flex" : "hidden md:flex")}>
                        {selectedTicket ? (
                            <div className="p-4 md:p-6 space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500">
                                <button onClick={() => setMobileChatPane("CHAT")} className="md:hidden flex items-center gap-2 text-sm text-gray-400 mb-4 bg-white/5 px-3 py-1.5 rounded-lg w-fit"><LogOut className="w-4 h-4 rotate-180" /> Back to Chat</button>
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
                                    <button onClick={() => setShowFreezeModal(true)} className="w-full py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-colors">INITIATE ACCOUNT FREEZE</button>
                                    <button onClick={() => setShowAuditModal(true)} className="w-full py-2.5 bg-[#162B40] text-white hover:bg-[#1E3A5F] rounded-xl text-xs font-bold transition-colors">VIEW FULL AUDIT LOG</button>
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
                </>
            )}

            {activeTab === "dashboard" && (
                <div className="flex-1 overflow-y-auto p-12 bg-[#060D14]">
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Agent Dashboard</h1>
                            <p className="text-gray-400 mt-2">High-level metrics and performance view.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#0A1622] rounded-2xl border border-white/5 p-6 space-y-2">
                                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Tickets Resolved</p>
                                <p className="text-4xl font-bold text-white font-mono">142</p>
                                <p className="text-teal text-xs">+12% this week</p>
                            </div>
                            <div className="bg-[#0A1622] rounded-2xl border border-white/5 p-6 space-y-2">
                                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">Avg Response</p>
                                <p className="text-4xl font-bold text-white font-mono">4m</p>
                                <p className="text-red-400 text-xs">Exceeds 3m SLA</p>
                            </div>
                            <div className="bg-[#0A1622] rounded-2xl border border-white/5 p-6 flex flex-col justify-center items-center text-center">
                                <Clock className="w-8 h-8 text-teal opacity-50 mb-2" />
                                <p className="text-gray-400 text-sm font-bold">Shift ends in 4h 12m</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "users" && (
                <div className="flex-1 h-full overflow-y-auto p-4 md:p-12 bg-[#060D14]">
                    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">CRM Directory</h1>
                                <p className="text-gray-400 mt-1 md:mt-2 text-sm md:text-base">Comprehensive user management and administration.</p>
                            </div>
                            <div className="relative w-full md:w-80 shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                <input type="text" placeholder="Search UUID, email..." className="w-full bg-[#162B40] border border-white/5 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-teal/50" />
                            </div>
                        </div>

                        <div className="bg-[#0A1622] rounded-2xl border border-white/5 overflow-hidden">
                            <div className="overflow-x-auto hide-scrollbar">
                                <table className="w-full text-left bg-[#0A1622]">
                                    <thead className="bg-[#162B40]/50 border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Role / Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {sysUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal/20 to-dark-blue flex items-center justify-center border border-white/10 shrink-0">
                                                            <span className="text-teal font-bold">{user.email.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-bold text-white">{user.full_name || "Unverified User"}</h3>
                                                            <p className="text-xs text-gray-500">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <span className="text-xs font-bold text-teal bg-teal/10 border border-teal/20 px-2 py-1 rounded-full uppercase tracking-wider">
                                                        {user.role}
                                                    </span>
                                                    {user.two_factor_enabled && (
                                                        <span className="ml-2 text-[10px] text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded-md uppercase">2FA ON</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 hidden lg:table-cell">
                                                    <span className="text-sm text-gray-400 font-mono">
                                                        {new Date(user.created_at).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="px-3 py-1.5 bg-[#162B40] border border-white/5 group-hover:bg-teal group-hover:text-[#060D14] text-gray-400 transition-colors font-bold text-xs rounded-lg">
                                                        Manage
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sysUsers.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={4} className="py-24 text-center">
                                                    <Users className="w-12 h-12 text-teal opacity-20 mx-auto mb-4" />
                                                    <span className="text-gray-400 text-sm">No users found.</span>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "onboarding" && (
                <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-[#060D14]">
                    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                                <Zap className="text-teal" size={32} />
                                Active Onboarding Session Queue
                            </h1>
                            <p className="text-gray-400 mt-2">Manage incoming institutional linkage requests and professional mentorship sessions.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tickets.filter(t => t.category === 'ONBOARDING' || t.onboarding_status).map((t) => (
                                <div key={t.id} className="bg-[#0A1622] rounded-2xl border border-white/5 p-6 space-y-4 hover:border-teal/30 transition-all group relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-24 h-24 bg-teal/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-teal/10 transition-colors" />
                                     
                                     <div className="flex justify-between items-start">
                                         <div className="px-3 py-1 bg-black/40 border border-white/5 rounded-full text-[10px] font-mono text-gray-500">#{t.id.substring(0,8)}</div>
                                         <div className={cn("px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase", 
                                             t.onboarding_status === 'REQUESTED' ? "bg-teal/10 text-teal animate-pulse" : 
                                             t.onboarding_status === 'IN_PROGRESS' ? "bg-blue-500/10 text-blue-400" : "bg-white/5 text-gray-500" )}>
                                             {t.onboarding_status || 'PENDING'}
                                         </div>
                                     </div>

                                     <h3 className="text-lg font-bold text-white group-hover:text-teal transition-colors">Onboarding Request</h3>
                                     <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">User {t.user_id} is awaiting an institutional walkthrough and API linkage confirmation.</p>
                                     
                                     <div className="pt-4 border-t border-white/5 flex gap-3">
                                         <button 
                                            onClick={() => { setActiveTab("chat"); handleSelectTicket(t); }}
                                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">Open Chat</button>
                                         <button 
                                            onClick={() => { handleSelectTicket(t); handleGenerateMeet(); }}
                                            disabled={loading || t.onboarding_status === 'COMPLETED'}
                                            className="flex-1 py-3 bg-gradient-to-r from-teal to-dark-blue text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-teal/5 group-hover:shadow-teal/20">
                                             {t.onboarding_status === 'IN_PROGRESS' ? 'Join Meet' : 'Start Meet'}
                                         </button>
                                     </div>
                                </div>
                            ))}
                            {tickets.filter(t => t.category === 'ONBOARDING' || t.onboarding_status).length === 0 && (
                                <div className="col-span-full py-20 text-center space-y-4 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                    <Sparkles className="w-12 h-12 text-teal opacity-20 mx-auto" />
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No active onboarding requests</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "academy" && (
                <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-[#060D14]">
                    <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-20">
                        <AcademyManagement />
                    </div>
                </div>
            )}

            {/* Modals */}
            {showFreezeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0A1622] border border-red-500/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-red-500/5 border-b border-red-500/10 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-red-500">Initiate Extreme Account Freeze</h2>
                                <p className="text-gray-400 text-sm mt-1">This action immediately revokes all access tokens and halts active algorithm trading.</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-white font-medium">Are you sure you want to freeze User ID: <span className="font-mono text-gray-400">{selectedTicket?.user_id}</span>?</p>
                            <textarea placeholder="Reason for freeze (REQUIRED)..." className="w-full bg-[#162B40] border border-white/5 rounded-lg p-3 text-white placeholder:text-gray-500 outline-none focus:border-red-500/50 min-h-[100px]"></textarea>
                            <div className="flex items-center gap-3 pt-4">
                                <button onClick={() => setShowFreezeModal(false)} className="flex-1 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 font-bold transition-colors">CANCEL</button>
                                <button
                                    onClick={() => {
                                        setIsFreezing(true);
                                        setTimeout(() => { setIsFreezing(false); setShowFreezeModal(false); alert("Account Frozen Successfully."); }, 1500);
                                    }}
                                    className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-bold transition-all shadow-lg flex justify-center items-center"
                                >
                                    {isFreezing ? <Loader2 className="w-5 h-5 animate-spin" /> : "EXECUTE FREEZE"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAuditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0A1622] border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <FileText className="text-teal" /> Full Audit Log / {selectedTicket?.user_id}
                            </h2>
                            <button onClick={() => setShowAuditModal(false)} className="text-gray-500 hover:text-white p-2"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#060D14]">
                            <div className="bg-[#162B40] border border-white/5 rounded-xl p-4 font-mono text-sm">
                                <p className="text-gray-500 mb-1">[2023-10-24 14:22:01] <span className="text-teal">AUTH_LOGIN</span> IP: 192.168.1.5</p>
                                <p className="text-gray-500 mb-1">[2023-10-24 14:23:45] <span className="text-yellow-500">CAPITAL_CONNECT</span> Token: a3f...92c</p>
                                <p className="text-gray-500 mb-1">[2023-10-24 14:45:12] <span className="text-blue-500">ENGINE_START</span> Strategy: Velocity</p>
                                <p className="text-gray-500 mb-1">[2023-10-24 15:01:22] <span className="text-red-500">TRADE_EXECUTE</span> SHORT TSLA @ 212.50 -- ERROR 402</p>
                                <p className="text-gray-500 mb-1">[2023-10-24 15:05:00] <span className="text-teal">SUPPORT_TICKET</span> Opened TKT-{selectedTicket?.id}</p>
                            </div>
                            <div className="text-center text-gray-600 font-medium py-4">End of accessible logs</div>
                        </div>
                        <div className="p-4 border-t border-white/5 bg-[#0A1622] flex justify-end">
                            <button className="px-6 py-2.5 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 font-bold transition-colors">Download PDF</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
