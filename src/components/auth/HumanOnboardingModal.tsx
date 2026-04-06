"use client";

import { useState } from "react";
import { Video, Calendar, Phone, CheckCircle2, Loader2, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HumanOnboardingModal({ onClose }: { onClose: () => void }) {
    const [formData, setFormData] = useState({
        phone: "",
        preferredTime: "",
        email: "" // Optional if already in some context
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${SOCKET_URL}/api/onboarding/request-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) setSuccess(true);
        } catch { } finally { setLoading(false); }
    };

    return (
        <div className="bg-[#0A1622] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-500 max-w-sm w-full mx-auto">
            {!success ? (
                <>
                    <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center border border-teal/20">
                                <Video size={20} className="text-teal" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Concierge Session</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Live Google Meet Walkthrough</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-1">Identity Verification (Email)</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-teal outline-none transition-all placeholder:text-gray-700"
                                placeholder="Confirmed email address..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-1">WhatsApp / Phone</label>
                            <div className="relative group">
                                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-teal outline-none transition-all placeholder:text-gray-700"
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-1">Preferred Time Window</label>
                            <div className="relative group">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={formData.preferredTime}
                                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-teal outline-none transition-all placeholder:text-gray-700"
                                    placeholder="e.g. Tomorrow 2PM GMT"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-teal to-[#1B263B] text-gold font-black py-3 rounded-xl border border-white/10 hover:shadow-[0_0_20px_rgba(0,191,166,0.2)] transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest group"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <>Request Live Session <ArrowRight size={14} className="group-hover:translate-x-1" /></>}
                        </button>
                    </form>
                </>
            ) : (
                <div className="text-center py-6 animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal/20">
                        <CheckCircle2 size={32} className="text-teal" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">Request Logged</h3>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">Our Senior Onboarding Desk will reach out to organize your Google Meet session shortly.</p>
                    <button
                        onClick={onClose}
                        className="text-[10px] font-black uppercase tracking-widest text-teal hover:underline"
                    >
                        Return to Dashboard
                    </button>
                </div>
            )}
        </div>
    );
}
