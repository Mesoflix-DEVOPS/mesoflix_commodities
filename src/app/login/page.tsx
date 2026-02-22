"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Key, User, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuthPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState(""); // This will now be the API password
    const [apiKey, setApiKey] = useState("");
    const [fullName, setFullName] = useState("");
    const [accountType, setAccountType] = useState<"demo" | "live">("demo");
    const [showPassword, setShowPassword] = useState(false); // This will control the single password field
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Reset error when switching mode
    useEffect(() => {
        setError("");
    }, [isLogin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const payload = isLogin
            ? { email, password }
            : { email, fullName, apiKey, apiPassword: password, accountType }; // Use same password for both

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || (isLogin ? "Login failed" : "Registration failed"));
            }

            // Success animation or message could go here
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
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
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 md:p-10 transition-all duration-500 hover:border-white/20">

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">
                            {isLogin ? "Welcome Back" : "Create Account"}
                        </h1>
                        <p className="text-gray-400 text-sm">
                            {isLogin
                                ? "Enter your credentials to access your dashboard"
                                : "Join the premium commodity trading platform"}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={18} />
                                    <input
                                        type="text"
                                        required={!isLogin}
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="animate-in fade-in duration-300">
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

                        {!isLogin && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Capital.com API Key</label>
                                <div className="relative group mb-4">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={18} />
                                    <input
                                        type="text"
                                        required={!isLogin}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-teal focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                                        placeholder="Capital.com API Key"
                                    />
                                </div>

                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Default Environment</label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setAccountType("demo")}
                                        className={cn(
                                            "py-2.5 rounded-xl border font-bold text-xs transition-all",
                                            accountType === "demo"
                                                ? "bg-teal/10 border-teal text-teal shadow-[0_0_15px_rgba(0,191,166,0.2)]"
                                                : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                                        )}
                                    >
                                        DEMO ACCOUNT
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAccountType("live")}
                                        className={cn(
                                            "py-2.5 rounded-xl border font-bold text-xs transition-all",
                                            accountType === "live"
                                                ? "bg-teal/10 border-teal text-teal shadow-[0_0_15px_rgba(0,191,166,0.2)]"
                                                : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                                        )}
                                    >
                                        LIVE ACCOUNT
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mb-6 px-1 italic">
                                    Tip: You can dynamically switch between Demo and Real data anytime from your terminal without logging out.
                                </p>
                            </div>
                        )}

                        <div className="animate-in fade-in duration-500">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                {isLogin ? "API Password" : "Capital.com API Password"}
                            </label>
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
                            {!isLogin && (
                                <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                                    <AlertCircle size={10} /> Found in Capital.com Settings &gt; API Integration
                                </p>
                            )}
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
                                        {isLogin ? "Sign In" : "Register Account"}
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                        </button>
                    </form>

                    {/* Toggle */}
                    <div className="mt-8 text-center">
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

                    {/* Hint */}
                    <div className="mt-10 pt-6 border-t border-white/5 text-center">
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">
                            Sessions persist for 3 days • Secured by End-to-End Encryption
                        </p>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-8 flex justify-center gap-6 text-xs text-gray-500">
                    <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
                    <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
                    <Link href="/support" className="hover:text-gray-300 transition-colors">Help Center</Link>
                </div>
            </div >
        </div >
    );
}
