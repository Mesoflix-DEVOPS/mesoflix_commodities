"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AgentRegisterPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/support/agent/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration failed");

            // Auto redirect to login on success
            router.push("/support/login?registered=true");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#060D14] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal/10 rounded-full blur-[150px] pointer-events-none" />

            <div className="w-full max-w-md bg-[#0A1622] rounded-3xl border border-white/10 p-8 relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-4 mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal/20 to-teal/5 border border-teal/20 rounded-2xl flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-teal" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Agent Registration</h1>
                        <p className="text-gray-400 text-sm mt-1">Request portal access clearance</p>
                    </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Full Legal Name"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className="w-full bg-[#162B40] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-medium"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <input
                                type="email"
                                placeholder="Corporate Email Address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-[#162B40] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-medium"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <input
                                type="password"
                                placeholder="Create Secure Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-[#162B40] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-medium"
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-teal to-[#009b86] hover:from-[#00b39b] hover:to-teal text-[#0A1622] rounded-xl font-bold shadow-[0_0_20px_rgba(0,191,166,0.3)] transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Clearance Request"}
                        {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </button>

                    <div className="text-center pt-2">
                        <Link href="/support/login" className="text-xs font-medium text-gray-500 hover:text-teal transition-colors">
                            Already cleared? Authenticate here.
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
