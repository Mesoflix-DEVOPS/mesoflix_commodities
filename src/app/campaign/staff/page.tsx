"use client";

import { useState } from "react";
import { 
    LayoutDashboard, 
    Mail, 
    Lock, 
    User, 
    ArrowRight, 
    Megaphone, 
    ShieldCheck, 
    Activity, 
    Zap,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Eye,
    EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StaffAuthPortal() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        
        try {
            // Institutional Auth Logic
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.fullName,
                    // For registration via this portal, we could optionally tag them
                    // but for now we follow the user's flow of manual assignment
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/campaign/dashboard");
                }, 1500);
            } else {
                setError(data.message || "Authentication failed. Please check your credentials.");
            }
        } catch (err) {
            setError("Security Bridge Offline. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#06111C] text-white flex flex-col font-sans selection:bg-teal/30">
            {/* Background Decor */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="p-8 flex justify-between items-center relative z-10">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal to-dark-blue rounded-xl flex items-center justify-center border border-white/10 shadow-lg shadow-teal/5">
                        <span className="text-gold font-bold">M</span>
                    </div>
                    <span className="font-black text-xl tracking-tighter uppercase whitespace-nowrap">
                        Mesoflix<span className="text-teal">_Campaigns</span>
                    </span>
                </Link>
                <div className="hidden md:flex gap-8 items-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Institutional Portal v2.4</span>
                    <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">System Secure</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 lg:p-24 gap-16 relative z-10 w-full max-w-7xl mx-auto">
                {/* Left Side: Manifest */}
                <div className="hidden lg:flex flex-col flex-1 space-y-12">
                    <div className="space-y-4">
                        <h2 className="text-teal font-black text-xs uppercase tracking-[0.3em]">Partner Ecosystem</h2>
                        <h1 className="text-6xl font-black leading-[0.95] tracking-tighter">
                            Grow The <br /> 
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">Revolution.</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-md leading-relaxed pt-2">
                            Access your personalized marketing dashboard, track institutional leads, and manage strategic campaign assets.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {[
                            { icon: Activity, title: "Real-time Metrics", desc: "Live P&L and reach analytics updated per click." },
                            { icon: Megaphone, title: "Strategic Distribution", desc: "Direct access to premium visual and video assets." },
                            { icon: Zap, title: "Automated Attribution", desc: "Leads automatically assigned via secure tracking." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 group">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-teal/30 transition-all duration-500 shrink-0">
                                    <item.icon className="text-teal" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">{item.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Auth Box */}
                <div className="w-full max-w-md">
                    <div className="bg-[#0A1622] border border-white/10 rounded-[3rem] p-10 md:p-12 shadow-2xl relative overflow-hidden group">
                        {/* Decorative gradient */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-teal/10 transition-all duration-700" />
                        
                        <div className="space-y-8 relative z-10">
                            <div className="text-center">
                                <h2 className="text-3xl font-black text-white tracking-tight">{isLogin ? 'Welcome Back' : 'Join the Team'}</h2>
                                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mt-2">
                                    {isLogin ? 'Enter your staff credentials' : 'Create your campaign partner account'}
                                </p>
                            </div>

                            {success ? (
                                <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center border border-teal/20">
                                        <CheckCircle2 className="text-teal" size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Security Cleared</h3>
                                        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mt-1">Redirecting to command center...</p>
                                    </div>
                                </div>
                            ) : (
                                <form className="space-y-5" onSubmit={handleSubmit}>
                                    {!isLogin && (
                                        <div className="space-y-2">
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={18} />
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={formData.fullName}
                                                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                                                    placeholder="Institutional Name" 
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-teal/50 transition-all focus:bg-white/[0.08]"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={18} />
                                            <input 
                                                type="email" 
                                                required
                                                value={formData.email}
                                                onChange={e => setFormData({...formData, email: e.target.value})}
                                                placeholder="Professional Email" 
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-teal/50 transition-all focus:bg-white/[0.08]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal transition-colors" size={18} />
                                            <input 
                                                type={showPassword ? "text" : "password"} 
                                                required
                                                value={formData.password}
                                                onChange={e => setFormData({...formData, password: e.target.value})}
                                                placeholder="Secret Key" 
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white focus:outline-none focus:border-teal/50 transition-all focus:bg-white/[0.08]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-shake">
                                            <AlertCircle className="text-red-500 shrink-0" size={18} />
                                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{error}</p>
                                        </div>
                                    )}

                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-5 bg-teal hover:bg-[#00b39b] disabled:bg-teal/50 text-[#0A1622] rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-teal/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                            <> {isLogin ? 'Access Portal' : 'Establish Partner'} <ArrowRight size={18} /> </>
                                        )}
                                    </button>
                                </form>
                            )}

                            <div className="text-center">
                                <button 
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-teal transition-colors"
                                >
                                    {isLogin ? "Don't have an account? Synchronize Here" : "Already a partner? Access Terminal"}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 text-center text-[10px] font-black text-gray-700 uppercase tracking-widest space-x-6">
                        <Link href="/privacy" className="hover:text-gray-500">Privacy Protocol</Link>
                        <Link href="/terms" className="hover:text-gray-500">Service Terms</Link>
                        <span>© 2026 Mesoflix Hub</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
