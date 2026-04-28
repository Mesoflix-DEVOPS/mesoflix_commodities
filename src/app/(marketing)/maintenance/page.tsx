"use client";

import { useState, useEffect } from "react";
import { Timer, Hammer, Shield, Zap, ArrowRight, Monitor, Lock, Terminal } from "lucide-react";
import Link from "next/link";

export default function MaintenancePage() {
    const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 59, seconds: 59 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#070E14] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
            
            {/* Glow Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-teal/10 rounded-full blur-[150px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-gold/5 rounded-full blur-[150px] animate-pulse delay-1000" />

            <div className="relative z-10 max-w-2xl w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Brand Header */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-gradient-to-br from-teal to-dark-blue rounded-2xl shadow-[0_0_40px_rgba(0,191,166,0.2)] border border-white/10 group transition-transform hover:scale-110 duration-500">
                        <Terminal size={40} className="text-gold" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                        Mesoflix <span className="text-teal">Terminal</span>
                    </h1>
                </div>

                {/* Status Indicator */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal/10 border border-teal/20 rounded-full text-teal text-xs font-black uppercase tracking-[0.2em] animate-pulse">
                    <div className="w-2 h-2 bg-teal rounded-full shadow-[0_0_10px_#00BFA6]" />
                    Engine Optimization in Progress
                </div>

                {/* Main Message */}
                <div className="space-y-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                        We're upgrading your <br />
                        <span className="bg-gradient-to-r from-teal to-gold bg-clip-text text-transparent">Institutional Trading Experience</span>
                    </h2>
                    <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                        To maintain our commitment as a premium Introducing Broker, we are implementing real-time data delivery and AI onboarding enhancements.
                    </p>
                </div>

                {/* Countdown Timer */}
                <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-sm mx-auto">
                    {[
                        { label: 'Hours', value: timeLeft.hours },
                        { label: 'Minutes', value: timeLeft.minutes },
                        { label: 'Seconds', value: timeLeft.seconds }
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <div className="w-20 h-24 md:w-24 md:h-28 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center mb-2 shadow-2xl relative group overflow-hidden">
                                <div className="absolute inset-0 bg-teal/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="text-3xl md:text-4xl font-mono font-black text-white">{String(item.value).padStart(2, '0')}</span>
                            </div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* Feature Previews */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
                    {[
                        { icon: Zap, text: 'Real-time Feeds' },
                        { icon: Shield, text: 'Secure Linkage' },
                        { icon: Monitor, text: 'AI Onboarding' }
                    ].map((feature, i) => (
                        <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
                            <feature.icon size={18} className="text-teal" />
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{feature.text}</span>
                        </div>
                    ))}
                </div>

                {/* Meta Info */}
                <div className="pt-12 border-t border-white/5 flex flex-col items-center space-y-6">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em]">
                        Systems Restoring: 06:00 PM GMT+3
                    </p>
                    <div className="flex gap-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <Link href="/support" className="hover:text-teal transition-colors flex items-center gap-2">
                            Need Help? <ArrowRight size={12} />
                        </Link>
                        <span className="text-white/10">|</span>
                        <span className="text-gray-700">Ver 2.4.0-Optimization</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
