"use client";

import { PieChart, Clock, Construction } from "lucide-react";

export default function ComingSoonPage({ title, sector }: { title: string, sector: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="relative">
                <div className="w-32 h-32 bg-teal/5 rounded-[2.5rem] border border-teal/10 flex items-center justify-center shadow-2xl">
                    <Construction size={48} className="text-teal/40" />
                </div>
                <div className="absolute -top-4 -right-4 bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-500/20">
                    Phase 2
                </div>
            </div>

            <div className="max-w-md">
                <h2 className="text-teal font-black text-[11px] uppercase tracking-[0.4em] mb-3">{sector} Sector</h2>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-4">{title} Module</h1>
                <p className="text-sm text-gray-400 leading-relaxed font-medium">
                    This advanced analytical module is currently being synthesized for institutional deployment.
                    Full data visualization and reporting will be available in the next system update.
                </p>
            </div>

            <div className="flex items-center gap-6 pt-4">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Status</span>
                    <span className="text-xs font-bold text-amber-500 uppercase">Synthesizing</span>
                </div>
                <div className="w-px h-8 bg-white/5" />
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Priority</span>
                    <span className="text-xs font-bold text-teal uppercase">High</span>
                </div>
            </div>
        </div>
    );
}
