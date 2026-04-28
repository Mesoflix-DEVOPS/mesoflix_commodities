"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#06111C] text-white selection:bg-teal/30">
            <Suspense fallback={
                <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-teal" />
                    <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Synchronizing Campaign Environment</p>
                </div>
            }>
                {children}
            </Suspense>
        </div>
    );
}
