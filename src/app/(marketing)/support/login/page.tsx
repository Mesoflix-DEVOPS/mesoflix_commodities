"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, Loader2, ArrowRight, Smartphone, Key } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export default function AgentLoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<"LOGIN" | "2FA">("LOGIN");

    // Login State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // 2FA State
    const [totp, setTotp] = useState("");
    const [setup2FA, setSetup2FA] = useState(false);
    const [qrUrl, setQrUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [tempToken, setTempToken] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/support/agent/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Login failed");

            if (data.setup2FA || data.requires2FA) {
                setTempToken(data.tempToken);
                if (data.setup2FA) {
                    setSetup2FA(true);
                    setQrUrl(data.otpauthUrl);
                    setSecret(data.secret);
                }
                setStep("2FA");
            } else {
                router.push("/support/dashboard");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handle2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/support/agent/auth/2fa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ totp, tempToken })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "2FA verification failed");

            router.push("/support/dashboard");
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
                        <h1 className="text-2xl font-bold text-white tracking-tight">Agent Portal</h1>
                        <p className="text-gray-400 text-sm mt-1">Authorized Support Personnel Only</p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium text-center">
                        {error}
                    </div>
                )}

                {step === "LOGIN" ? (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
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
                                    placeholder="Secure Password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-[#162B40] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-teal to-[#009b86] hover:from-[#00b39b] hover:to-teal text-[#0A1622] rounded-xl font-bold shadow-[0_0_20px_rgba(0,191,166,0.3)] transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
                            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                        </button>

                        <div className="text-center pt-2">
                            <Link href="/support/register" className="text-xs font-medium text-gray-500 hover:text-teal transition-colors">
                                Need an agent account? Request access.
                            </Link>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handle2FA} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        {setup2FA && (
                            <div className="p-5 bg-white rounded-2xl flex flex-col items-center justify-center space-y-4">
                                <p className="text-[#0A1622] font-bold text-center text-sm">Scan with Google Authenticator to Secure Account</p>
                                <div className="p-2 border border-dashed border-gray-300 rounded-xl">
                                    <QRCodeSVG value={qrUrl} size={180} />
                                </div>
                                <div className="text-center w-full mt-2">
                                    <p className="text-xs text-gray-500 font-medium mb-1">Manual Setup Key:</p>
                                    <code className="bg-gray-100 text-[#0A1622] px-3 py-1.5 rounded-lg text-sm font-bold tracking-widest">{secret}</code>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 ml-1">
                                <Smartphone className="w-4 h-4 text-teal" />
                                {setup2FA ? "Enter First Code to Verify" : "Enter Verification Code"}
                            </label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={totp}
                                    onChange={e => setTotp(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full bg-[#162B40] border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white text-2xl tracking-[0.5em] text-center placeholder:text-gray-600 focus:outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/50 transition-all font-bold"
                                    required
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || totp.length < 6}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-teal to-[#009b86] hover:from-[#00b39b] hover:to-teal text-[#0A1622] rounded-xl font-bold shadow-[0_0_20px_rgba(0,191,166,0.3)] transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
                            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
