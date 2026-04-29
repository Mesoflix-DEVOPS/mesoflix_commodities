"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    ShieldAlert, 
    Lock, 
    Mail, 
    Eye, 
    EyeOff, 
    ArrowRight, 
    Loader2,
    ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AdminLoginPortal() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                // Verify if it is an admin
                const meRes = await fetch("/api/auth/me");
                const meData = await meRes.json();
                
                if (meData.user.role === 'admin') {
                    router.push("/campaign/staff/admin");
                } else {
                    setError("Access Denied: Specialized Admin Clearance Required.");
                }
            } else {
                setError(data.error || "Authentication failed.");
            }
        } catch (err) {
            setError("Network failure. Connection to central security lost.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#06111C] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,191,166,0.05),transparent_50%)] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md space-y-8 relative z-10">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-4 bg-red-500/10 border border-red-500/20 rounded-[2rem] mb-4">
                        <ShieldAlert className="text-red-500" size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">ADMIN COMMAND</h1>
                    <p className="text-gray-500 text-sm font-black uppercase tracking-[0.2em]">Institutional Marketing Terminal</p>
                </div>

                {/* Login Form */}
                <div className="bg-[#0A1622] p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Admin Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal transition-colors" size={18} />
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
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Clearance Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-teal transition-colors" size={18} />
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••" 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 pl-12 pr-12 text-white placeholder:text-gray-600 focus:border-teal/50 transition-all outline-none" 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-xs font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <button 
                            disabled={loading}
                            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-red-500/10 transition-all active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                <>Initiate Command <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="pt-6 border-t border-white/5 text-center">
                        <Link href="/campaign/staff/admin/register" className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
                            Request New Admin Access Key
                        </Link>
                    </div>
                </div>

                {/* System Policy */}
                <div className="flex items-center gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
                    <ShieldCheck className="text-teal" size={24} />
                    <p className="text-[10px] text-gray-600 font-bold leading-relaxed">
                        Access to this terminal is strictly audited. Any unauthorized attempts to bypass protocols will be logged and reported to the system authority.
                    </p>
                </div>
            </div>
        </div>
    );
}
