"use client";

import { useState } from "react";
import { User, Mail, Key, Lock, ArrowRight, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ManualOnboardingForm() {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        apiKey: "",
        apiPassword: ""
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${SOCKET_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, accountType: 'demo' })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration Link Failed");

            setSuccess(true);
            setTimeout(() => {
                window.location.href = "/login?mode=login&registered=true";
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-teal/20 rounded-full flex items-center justify-center mb-4 border border-teal/50 shadow-[0_0_20px_rgba(0,191,166,0.3)]">
                    <CheckCircle2 size={32} className="text-teal animate-bounce" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Authentication Successful</h2>
                <p className="text-gray-400 text-sm">Synchronizing your institutional terminal... Redirecting to dashboard.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Full Name</label>
                    <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={16} />
                        <input
                            type="text"
                            required
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl focus:ring-1 focus:ring-teal focus:border-teal outline-none transition-all placeholder:text-gray-700 text-sm"
                            placeholder="Alex Thompson"
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={16} />
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl focus:ring-1 focus:ring-teal focus:border-teal outline-none transition-all placeholder:text-gray-700 text-sm"
                            placeholder="alex@institutional.com"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* API Key */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 flex items-center gap-1">
                        Capital API Key <ShieldCheck size={10} className="text-teal" />
                    </label>
                    <div className="relative group">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={16} />
                        <input
                            type="text"
                            required
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl focus:ring-1 focus:ring-teal focus:border-teal outline-none transition-all placeholder:text-gray-700 font-mono text-sm"
                            placeholder="Paste API Key..."
                        />
                    </div>
                </div>

                {/* API Password */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">API Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={16} />
                        <input
                            type="password"
                            required
                            value={formData.apiPassword}
                            onChange={(e) => setFormData({ ...formData, apiPassword: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl focus:ring-1 focus:ring-teal focus:border-teal outline-none transition-all placeholder:text-gray-700 text-sm"
                            placeholder="••••••••••••"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-xs flex items-center gap-2 animate-shake">
                    <ArrowRight size={14} className="rotate-180" />
                    <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal to-[#008f7a] text-[#0A1622] font-black py-3 rounded-xl hover:shadow-[0_0_20px_rgba(0,191,166,0.3)] transition-all disabled:opacity-50 relative group overflow-hidden uppercase tracking-widest text-xs"
            >
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <>Initialize Terminal <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                </span>
            </button>
        </form>
    );
}
