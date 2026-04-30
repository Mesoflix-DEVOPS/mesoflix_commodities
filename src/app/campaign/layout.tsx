"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import CampaignSidebar from "@/components/campaign/CampaignSidebar";

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Institutional Auth Route Check
    const isAuthPage = pathname === "/campaign/staff" || 
                       pathname === "/campaign/staff/admin/login" || 
                       pathname === "/campaign/staff/admin/register";

    if (isAuthPage) {
        return (
            <div className="min-h-screen bg-[#06111C] text-white selection:bg-teal/30">
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-teal" /></div>}>
                    {children}
                </Suspense>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#06111C] text-white selection:bg-teal/30 flex">
            <CampaignSidebar />
            <main className="flex-1 transition-all duration-500 min-h-screen overflow-x-hidden">
                <div className="md:pl-64 h-full"> 
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
