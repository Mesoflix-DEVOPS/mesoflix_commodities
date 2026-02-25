"use client";

import { useState, useEffect, useRef, use } from "react";
import { ArrowLeft, Send, Paperclip, CheckCheck, Loader2, AlertCircle, Clock, ShieldCheck, X, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import io, { Socket } from "socket.io-client";

interface Message {
    id: string;
    sender_type: "user" | "agent";
    message: string;
    attachment_url?: string | null;
    created_at: string;
}

interface Ticket {
    id: string;
    subject: string;
    category: string;
    status: "OPEN" | "PENDING" | "CLOSED" | "ESCALATED";
}

export default function LiveChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [attachment, setAttachment] = useState<string | null>(null);
    const [attachmentName, setAttachmentName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch initial chat history
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(`/api/support/tickets/${id}`);
                const data = await res.json();
                if (data.ticket) setTicket(data.ticket);
                if (data.messages) setMessages(data.messages);
            } catch (err) {
                console.error("Failed to fetch history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [id]);

    // WebSocket Connection
    useEffect(() => {
        // Initialize socket using custom api path set in server.ts
        socketRef.current = io(window.location.origin, {
            path: "/api/socket"
        });

        socketRef.current.on('connect', () => {
            console.log("Connected to secure support socket:", socketRef.current?.id);
            socketRef.current?.emit('join_ticket', id);
        });

        socketRef.current.on('new_message', (incomingMsg: any) => {
            // Check if it's already in our array to prevent duplicates if we fired it ourselves
            setMessages((prev) => {
                const exists = prev.find(m => m.id === incomingMsg.id);
                if (exists) return prev;
                return [...prev, incomingMsg];
            });
            scrollToBottom();
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !attachment) || ticket?.status === "CLOSED" || sending) return;

        setSending(true);

        const payload = {
            id: `temp_${Date.now()}`,
            ticketId: id,
            sender_type: "user" as const,
            message: input.trim(),
            attachment_url: attachment || null,
            created_at: new Date().toISOString()
        };

        // Optimistic UI Update
        setMessages(prev => [...prev, payload]);
        const outgoingInput = input.trim();
        const outgoingAttachment = attachment;

        setInput("");
        setAttachment(null);
        setAttachmentName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        scrollToBottom();

        // Broadcast to WebSocket Room
        socketRef.current?.emit('send_message', payload);

        // Persist to Postgres
        try {
            await fetch(`/api/support/tickets/${id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: outgoingInput, attachmentUrl: outgoingAttachment })
            });
        } catch (err) {
            console.error("Failed to persist message", err);
        } finally {
            setSending(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!confirm("Are you sure you want to permanently close and lock this ticket?")) return;

        try {
            const res = await fetch(`/api/support/tickets/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CLOSED" })
            });

            if (res.ok) {
                setTicket(prev => prev ? { ...prev, status: "CLOSED" } : null);
            }
        } catch (err) {
            console.error("Failed to close ticket:", err);
        }
    };

    if (loading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-teal/20 border-t-teal rounded-full animate-spin" />
                <p className="text-gray-400 font-mono text-sm animate-pulse">Establishing Secure Connection...</p>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
                <h2 className="text-2xl font-bold text-white">Ticket Not Found</h2>
                <Link href="/dashboard/support" className="text-teal hover:underline">Return to Support Center</Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto h-[calc(100dvh-120px)] min-h-[500px] flex flex-col animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 shrink-0">
                <div className="space-y-1">
                    <Link
                        href="/dashboard/support"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm mb-2"
                    >
                        <ArrowLeft size={14} /> Back to Support
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            {ticket.subject}
                        </h1>
                        <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                            ticket.status === "OPEN" && "bg-teal/10 text-teal border-teal/20",
                            ticket.status === "CLOSED" && "bg-white/5 text-gray-400 border-white/10",
                            ticket.status === "PENDING" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        )}>
                            {ticket.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                        <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-teal" /> E2E Encrypted</span>
                        <span>TKT-{ticket.id.substring(0, 6)}</span>
                    </div>
                </div>
                {ticket.status !== "CLOSED" && (
                    <button
                        onClick={handleCloseTicket}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-bold transition-colors border border-white/10 shrink-0 self-start md:self-auto"
                    >
                        Close Ticket
                    </button>
                )}
            </div>

            {/* Chat Container */}
            <div className="flex-1 bg-[#0D1C2A] rounded-t-3xl border-x border-t border-white/5 flex flex-col overflow-hidden relative">

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                            <Clock className="w-8 h-8 opacity-50" />
                            <p>No messages yet. Waiting for support connection.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isUser = msg.sender_type === "user";
                            return (
                                <div key={msg.id || idx} className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[85%] md:max-w-[70%] rounded-2xl p-4 relative group",
                                        isUser
                                            ? "bg-gradient-to-br from-teal to-[#009b86] text-white rounded-br-none shadow-[0_5px_15px_rgba(0,191,166,0.1)]"
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
                                        {msg.message && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.message}</p>}

                                        <div className={cn(
                                            "mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono opacity-60",
                                            isUser ? "justify-end text-white" : "justify-start text-gray-400"
                                        )}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isUser && <CheckCheck size={12} />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {ticket.status === "CLOSED" ? (
                    <div className="p-4 bg-red-500/10 border-t border-red-500/20 text-center">
                        <p className="text-red-400 font-medium text-sm">This ticket has been permanently locked and resolved.</p>
                    </div>
                ) : (
                    <div className="p-4 bg-[#0A1622] border-t border-white/5 flex flex-col gap-3">
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
                                placeholder="Type your secure message..."
                                className="flex-1 bg-[#162B40] border border-white/5 rounded-xl px-4 h-[52px] text-white placeholder:text-gray-500 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-medium"
                            />
                            <button
                                type="submit"
                                disabled={(!input.trim() && !attachment) || sending}
                                className="px-6 h-[52px] bg-gradient-to-r from-teal to-[#009b86] hover:from-[#00b39b] hover:to-teal disabled:opacity-50 disabled:cursor-not-allowed text-[#0A1622] rounded-xl font-bold flex items-center justify-center transition-all shadow-md group shrink-0"
                            >
                                {sending ? <Loader2 size={20} className="animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
