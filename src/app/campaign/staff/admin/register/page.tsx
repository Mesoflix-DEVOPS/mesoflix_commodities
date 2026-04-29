"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    ShieldPlus, 
    Lock, 
    Mail, 
    User,
    Key,
    ArrowRight, 
    Loader2,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AdminRegistrationPortal() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [protocolKey, setProtocolKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Institutional Key Check (Simulated for this implementation, can be hardened)
        if (protocolKey !== "MESO-CMD-2026") {
            setError("Invalid Protocol Key. Administrative clearance rejected.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email, 
                    password, 
                    full_name: fullName,
                    role: "admin" // Forcing admin role for this specific portal
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => router.push("/campaign/staff/admin/login"), 2000);
            } else {
                setError(data.message || data.error || "Registration failed.");
            }
        } catch (err) {
            setError("Deployment failed. Registry server unreachable.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#06111C] flex flex-col items-center justify-center p-6 text-center space-y-6">
                <div className="w-24 h-24 bg-teal/10 rounded-full flex items-center justify-center border border-teal/20 animate-bounce">
                    <CheckCircle2 className="text-teal" size={48} />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight uppercase">Clearance Established</h1>
                <p className="text-gray-500 max-w-sm font-medium">Your administrator identity has been deployed to the registry. Redirecting to secure login...</p>
                <Loader2 className="animate-spin text-teal" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#06111C] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_30%,rgba(0,191,166,0.03),transparent_40%)] pointer-events-none" />
            
            <div className="w-full max-w-lg space-y-8 relative z-10">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-4 bg-teal/10 border border-teal/20 rounded-[2rem] mb-4">
                        <ShieldPlus className="text-teal" size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Admin Registry</h1>
                    <p className="text-gray-500 text-sm font-black uppercase tracking-[0.2em]">Deployment Protocol v1.0</p>
                </div>

                {/* Register Form */}
                <div className="bg-[#0A1622] p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
                    <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Full Identity</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal transition-colors" size={16} />
                                <input 
                                    type="text" 
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe" 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 pl-12 text-white placeholder:text-gray-600 focus:border-teal/50 transition-all outline-none" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Admin Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal transition-colors" size={16} />
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@mesoflix.com" 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 pl-12 text-white placeholder:text-gray-600 focus:border-teal/50 transition-all outline-none" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Institutional Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal transition-colors" size={16} />
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••" 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 pl-12 text-white placeholder:text-gray-600 focus:border-teal/50 transition-all outline-none" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Protocol Master Key</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal transition-colors" size={16} />
                                <input 
                                    type="text" 
                                    required
                                    value={protocolKey}
                                    onChange={(e) => setProtocolKey(e.target.value)}
                                    placeholder="MESO-XXX-XXXX" 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 pl-12 text-white placeholder:text-gray-600 focus:border-teal/50 transition-all outline-none font-mono" 
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="md:col-span-2 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-xs font-bold text-center">
                                {error}
                            </div>
                        )}

                        <button 
                            disabled={loading}
                            className="md:col-span-2 py-4 bg-teal hover:bg-[#00b39b] text-dark-blue rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-teal/10 transition-all active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                <>Register Admin Authority <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="pt-6 border-t border-white/5 text-center">
                        <Link href="/campaign/staff/admin/login" className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
                            Already Have Clearance? Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
