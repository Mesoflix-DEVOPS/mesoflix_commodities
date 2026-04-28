"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import CampaignSidebar from "@/components/campaign/CampaignSidebar";

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#06111C] text-white selection:bg-teal/30 flex">
            <CampaignSidebar />
            <main className="flex-1 transition-all duration-500 min-h-screen overflow-x-hidden md:pl-0">
                {/* Responsive spacing for sidebar is handled by sidebar absolute/fixed vs main margin? */}
                {/* Actually Sidebar is fixed. So main needs pl-64 or dynamic. */}
                <div className="pl-64 h-full"> 
                    <Suspense fallback={
                        <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin text-teal" />
                            <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Synchronizing Campaign Environment</p>
                        </div>
                    }>
                        {children}
                    </Suspense>
                </div>
            </main>
        </div>
    );
}
