"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, Star, TrendingUp, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const OfferPopup = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Show popup after 3 seconds
        const timer = setTimeout(() => {
            const dismissed = localStorage.getItem("offer-dismissed");
            if (!dismissed) {
                setIsVisible(true);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const dismiss = () => {
        setIsVisible(false);
        localStorage.setItem("offer-dismissed", "true");
    };

    if (!isMounted || !isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-blue/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="relative w-full max-w-md bg-white dark:bg-[#0A1622] rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-gold/40 overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col">
                {/* Close Button */}
                <button
                    onClick={dismiss}
                    className="absolute top-6 right-6 p-2 rounded-full bg-dark-blue/5 dark:bg-white/5 text-dark-blue dark:text-white hover:bg-dark-blue/10 dark:hover:bg-white/10 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Top Banner */}
                <div className="h-28 bg-golden-gradient relative flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="relative text-center">
                        <div className="flex justify-center gap-1 mb-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} size={12} fill="currentColor" className="text-dark-blue" />
                            ))}
                        </div>
                        <h3 className="text-dark-blue font-black text-xl tracking-tight uppercase">Limited Partner Offer</h3>
                    </div>
                </div>

                <div className="p-8 md:p-8 space-y-6 overflow-y-auto scrollbar-hide flex-1">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/10 border border-teal/20 text-teal text-[10px] font-bold uppercase tracking-widest">
                            <TrendingUp size={12} />
                            TradingView Integration
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-dark-blue dark:text-white leading-tight">
                            Get 3 Months of <span className="text-teal">TradingView Pro</span> Upgraded
                        </h2>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        Join over a quarter of a million traders using our **4.8/5 rated** TradingView integration. Execute your strategies with professional-grade tools and superior analytics.
                    </p>

                    <div className="bg-light-gray dark:bg-white/5 border border-dark-blue/5 dark:border-white/10 rounded-2xl p-6 flex items-start gap-4">
                        <div className="w-12 h-12 flex-shrink-0 bg-golden-gradient rounded-xl flex items-center justify-center text-dark-blue shadow-lg">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-dark-blue dark:text-white text-sm">How to claim:</h4>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                Open a new account via Mesoflix and make a first-time deposit of <span className="text-gold font-bold">$250 or more</span>.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            onClick={() => window.location.href = "/capital-check"}
                            className="w-full bg-dark-blue dark:bg-gradient-to-r dark:from-gold dark:via-[#FFDF00] dark:to-gold text-white dark:text-dark-blue py-4 rounded-xl font-black text-base hover:shadow-2xl transition-all flex items-center justify-center gap-3 transform active:scale-[0.98] border border-white/10 relative overflow-hidden group"
                        >
                            <span className="relative z-10">Claim Upgrade Now</span>
                            <ExternalLink size={18} className="relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                        <button
                            onClick={dismiss}
                            className="w-full py-4 rounded-xl font-bold text-sm text-gray-500 dark:text-gray-400 hover:text-dark-blue dark:hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            <span>Dismiss Offer</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-8 pt-4">
                        <div className="text-center">
                            <div className="text-xl font-black text-teal">4.8/5</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">User Rating</div>
                        </div>
                        <div className="w-px h-8 bg-dark-blue/10 dark:bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-xl font-black text-gold">250K+</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active Traders</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfferPopup;
