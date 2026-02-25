"use client";

import { useState } from "react";
import { ArrowLeft, Send, AlertCircle, FileText, Tag, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const TICKET_CATEGORIES = [
    "Technical Issue",
    "Withdrawal",
    "Deposit",
    "Trading Engine",
    "Account Verification",
    "Other"
] as const;

export default function NewTicketPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        category: "",
        subject: "",
        description: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.category || !formData.subject || !formData.description) {
            setError("Please fill in all required fields.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/support/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to submit ticket");
            }

            setSuccess(true);
            setTimeout(() => {
                router.push(`/dashboard/support/ticket/${data.ticketId}`);
            }, 1000);

        } catch (err: any) {
            console.error("Ticket creation error:", err);
            setError(err.message || "An unexpected error occurred while creating your ticket.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/dashboard/support"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors w-fit"
                >
                    <ArrowLeft size={16} />
                    Back to Support Center
                </Link>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Open New Ticket</h1>
                    <p className="text-gray-400">Describe your issue in detail. Our institutional support team operates 24/7.</p>
                </div>
            </div>

            {/* Form Container */}
            <div className="bg-[#0D1C2A] rounded-3xl border border-white/5 p-6 md:p-8 relative overflow-hidden">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[120px] pointer-events-none" />

                <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-red-500">Submission Error</p>
                                <p className="text-sm text-red-400/90">{error}</p>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="p-4 rounded-xl bg-teal/10 border border-teal/20 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                            <Send className="w-5 h-5 text-teal shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-teal">Ticket Created Successfully</p>
                                <p className="text-sm text-teal/80">Connecting you to a live secure chat session...</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Subject */}
                        <div className="space-y-3 md:col-span-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <FileText size={16} className="text-teal" />
                                Subject line
                            </label>
                            <input
                                type="text"
                                placeholder="Brief summary of your issue"
                                value={formData.subject}
                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                disabled={loading || success}
                                className="w-full bg-[#0A1622] border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-medium disabled:opacity-50"
                                required
                            />
                        </div>

                        {/* Category Dropdown */}
                        <div className="space-y-3 md:col-span-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <Tag size={16} className="text-teal" />
                                Support Category
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    disabled={loading || success}
                                    className="w-full bg-[#0A1622] border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-medium appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    required
                                >
                                    <option value="" disabled>Select the nature of your issue</option>
                                    {TICKET_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <div className="w-2 h-2 border-b-2 border-r-2 border-gray-500 rotate-45 translate-y-[-2px]" />
                                </div>
                            </div>
                        </div>

                        {/* Description Base */}
                        <div className="space-y-3 md:col-span-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <AlertCircle size={16} className="text-teal" />
                                Detailed Description
                            </label>
                            <textarea
                                placeholder="Provide as much context as possible so our agents can resolve this swiftly..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                disabled={loading || success}
                                className="w-full bg-[#0A1622] border border-white/5 rounded-xl px-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all min-h-[200px] resize-y disabled:opacity-50"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={loading || success}
                            className={cn(
                                "group relative flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal to-[#009b86] hover:from-[#00b39b] hover:to-teal text-white rounded-xl font-bold shadow-[0_0_20px_rgba(0,191,166,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,191,166,0.5)] overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed",
                            )}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                            ) : (
                                <Send className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                            )}
                            <span className="relative z-10 tracking-wide uppercase text-sm">
                                {loading ? "Initializing Secure Chat..." : "Initialize Support Chat"}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
