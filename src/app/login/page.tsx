"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, ArrowLeft, Bot, Video, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import OnboardingBot from "@/components/onboarding/OnboardingBot";
import ManualOnboardingForm from "@/components/auth/ManualOnboardingForm";
import HumanOnboardingModal from "@/components/auth/HumanOnboardingModal";

export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
                <div className="w-10 h-10 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <AuthPageForm />
        </Suspense>
    );
}

function AuthPageForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLogin, setIsLogin] = useState(true);
    const [showAI, setShowAI] = useState(false);
    const [showConcierge, setShowConcierge] = useState(false);

    // Sync isLogin with mode param
    useEffect(() => {
        const mode = searchParams.get("mode");
        if (mode === "register") {
            setIsLogin(false);
        } else if (mode === "login") {
            setIsLogin(true);
        }
    }, [searchParams]);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // 2FA Challenge States
    const [require2FA, setRequire2FA] = useState(false);
    const [tempToken, setTempToken] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [twoFactorError, setTwoFactorError] = useState("");
    const [isTwoFactorLoading, setIsTwoFactorLoading] = useState(false);

    // Reset error when switching mode
    useEffect(() => {
        setError("");
    }, [isLogin]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Login failed");
            }

            if (data.requires2FA) {
                setTempToken(data.tempToken);
                setRequire2FA(true);
                return;
            }

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handle2FASubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTwoFactorError("");
        setIsTwoFactorLoading(true);

        try {
            const res = await fetch("/api/auth/2fa/verify-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tempToken,
                    code: twoFactorCode,
                    isRecoveryMode
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Invalid authentication code");
            router.push("/dashboard");
        } catch (err: any) {
            setTwoFactorError(err.message);
        } finally {
            setIsTwoFactorLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A] px-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[120px] animate-pulse delay-700" />

            <div className="relative z-10 w-full max-w-md my-12">
                {/* Logo Section */}
                <div className="text-center mb-8 animate-fade-in-up">
                    <Link href="/" className="inline-flex items-center gap-2 group">
                        <div className="p-2 bg-gradient-to-br from-teal to-dark-blue rounded-lg shadow-lg group-hover:scale-110 transition-transform border border-white/10">
                            <span className="text-gold font-bold text-xl">M</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight">
                            <span className="text-white">Mesoflix_</span>
                            <span className="text-teal">Commodities</span>
                        </span>
                    </Link>
                </div>

                {/* Main Card */}
                <div className={cn(
                    "bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl transition-all duration-500 hover:border-white/20 overflow-hidden",
                    isLogin ? "p-8 md:p-10" : "p-8 md:p-10"
                )}>

                    {/* Header (Only for Login) */}
                    {isLogin && !require2FA && (
                        <div className="mb-8 animate-in fade-in duration-500">
                            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
                            <p className="text-gray-400 text-sm">Enter your credentials to access your dashboard</p>
                        </div>
                    )}

                    {/* Active Content */}
                    {require2FA ? (
                        <div className="p-8 md:p-10 animate-in fade-in duration-500">
                            <div className="mb-8">
                                <h1 className="text-2xl font-bold text-white mb-2">
                                    {isRecoveryMode ? "Account Recovery" : "Two-Factor Auth"}
                                </h1>
                                <p className="text-gray-400 text-sm">
                                    {isRecoveryMode
                                        ? "Enter one of your 10-character backup codes."
                                        : "Enter the 6-digit code from your authenticator app."}
                                </p>
                            </div>
                            <form onSubmit={handle2FASubmit} className="space-y-5">
                                <div>
                                    <input
                                        type="text"
                                        value={twoFactorCode}
                                        onChange={(e) => setTwoFactorCode(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-4 rounded-xl focus:ring-2 focus:ring-teal focus:border-transparent outline-none transition-all placeholder:text-gray-600 font-mono tracking-widest text-center text-xl shadow-inner"
                                        placeholder={isRecoveryMode ? "A1B2-C3D4" : "000000"}
                                    />
                                </div>

                                {twoFactorError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-2 text-sm animate-shake">
                                        <AlertCircle size={18} className="shrink-0" />
                                        <span>{twoFactorError}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isTwoFactorLoading || twoFactorCode.length < 6}
                                    className="w-full relative group overflow-hidden bg-gradient-to-r from-teal to-[#1B263B] text-gold font-bold py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,191,166,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {isTwoFactorLoading ? (
                                            <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                Verify Login
                                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </span>
                                </button>
                            </form>

                            <div className="mt-8 flex flex-col items-center gap-4">
                                <button
                                    onClick={() => { setIsRecoveryMode(!isRecoveryMode); setTwoFactorCode(""); setTwoFactorError(""); }}
                                    className="text-sm font-semibold text-teal hover:underline decoration-gold transition-colors"
                                >
                                    {isRecoveryMode ? "Use Authenticator App instead" : "Lost access? Use a Recovery Code"}
                                </button>
                                <button
                                    onClick={() => { setRequire2FA(false); setTempToken(""); }}
                                    className="text-xs text-gray-500 flex items-center gap-1 hover:text-white transition-colors"
                                >
                                    <ArrowLeft size={12} /> Cancel login
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {isLogin ? (
                                <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in duration-500">
                                    {/* ... existing fields ... */}
                                    <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={18} />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="animate-in fade-in duration-300">
                                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">API Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={18} />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-12 py-3 rounded-xl focus:ring-2 focus:ring-teal focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                                placeholder="Your Trading Password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-2 text-sm animate-shake">
                                            <AlertCircle size={18} className="shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full relative group overflow-hidden bg-gradient-to-r from-teal to-[#1B263B] text-gold font-bold py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,191,166,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Sign In
                                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                                    <div className="mb-6">
                                        <h1 className="text-2xl font-bold text-white mb-2">Institutional Signup</h1>
                                        <p className="text-gray-400 text-sm">Initialize your direct brokerage linkage protocol.</p>
                                    </div>
                                    
                                    <ManualOnboardingForm />

                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                        <div className="flex flex-col gap-3">
                                            <button 
                                                onClick={() => setShowAI(!showAI)}
                                                className="w-full py-3 px-4 bg-teal/10 border border-teal/20 rounded-xl flex items-center justify-between group hover:bg-teal/20 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-teal/20 rounded-lg flex items-center justify-center">
                                                        <Bot size={18} className="text-teal" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-teal uppercase tracking-widest leading-none mb-1">Guided Experience</p>
                                                        <p className="text-xs text-white font-medium">Use Institutional AI Assistant</p>
                                                    </div>
                                                </div>
                                                <ArrowRight size={16} className={cn("text-gray-500 group-hover:text-teal transition-all", showAI && "rotate-90")} />
                                            </button>

                                            <button 
                                                onClick={() => setShowConcierge(true)}
                                                className="w-full py-3 px-4 bg-gold/5 border border-gold/10 rounded-xl flex items-center justify-between group hover:bg-gold/10 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gold/20 rounded-lg flex items-center justify-center">
                                                        <Video size={18} className="text-gold" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-gold uppercase tracking-widest leading-none mb-1">Human Onboarding</p>
                                                        <p className="text-xs text-white font-medium">Request Google Meet Session</p>
                                                    </div>
                                                </div>
                                                <Sparkles size={16} className="text-gold animate-pulse" />
                                            </button>
                                        </div>

                                        {showAI && (
                                            <div className="h-[450px] pt-4 animate-in slide-in-from-top-4 duration-500">
                                                <OnboardingBot />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {showConcierge && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                                    <HumanOnboardingModal onClose={() => setShowConcierge(false)} />
                                </div>
                            )}

                            {/* Toggle */}
                            <div className={cn("text-center", isLogin ? "mt-8" : "mt-4 pb-4")}>
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    {isLogin
                                        ? "Don't have an account? "
                                        : "Already registered? "}
                                    <span className="text-teal font-semibold hover:underline decoration-gold">
                                        {isLogin ? "Create one now" : "Login here"}
                                    </span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Hint (Only for Login) */}
                    {isLogin && (
                        <div className="mt-10 pt-6 border-t border-white/5 text-center">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">
                                Sessions persist for 3 days • Secured by End-to-End Encryption
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Links */}
                <div className="mt-8 flex justify-center gap-6 text-xs text-gray-500">
                    <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
                    <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
                    <Link href="/support" className="hover:text-gray-300 transition-colors">Help Center</Link>
                </div>
            </div>
        </div>
    );
}
