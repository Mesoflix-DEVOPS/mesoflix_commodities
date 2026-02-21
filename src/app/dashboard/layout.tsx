"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import TopNav from "@/components/dashboard/TopNav";
import RightPanel from "@/components/dashboard/RightPanel";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setCollapsed] = useState(false);
    const [isMobileOpen, setMobileOpen] = useState(false);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        // Shared but lightweight user fetch for the shell
        fetch("/api/dashboard")
            .then(res => res.json())
            .then(data => setUserData(data?.user))
            .catch(() => { });
    }, []);

    return (
        <div className="min-h-screen bg-[#0D1B2A] text-white">
            <Sidebar
                isCollapsed={isCollapsed}
                setCollapsed={setCollapsed}
                isMobileOpen={isMobileOpen}
            />

            <div
                className={cn(
                    "flex flex-col transition-all duration-500",
                    isCollapsed ? "md:pl-20" : "md:pl-64"
                )}
            >
                <TopNav
                    userName={userData?.fullName || "Trader"}
                    onMenuClick={() => setMobileOpen(!isMobileOpen)}
                    isMobileOpen={isMobileOpen}
                />

                <div className="flex relative">
                    <main className="flex-1 p-6 md:p-12 animate-in fade-in duration-700">
                        <div className="max-w-7xl mx-auto">
                            {children}
                        </div>
                    </main>

                    {/* Integrated Right Panel - Collapsible within the flex flow */}
                    <div className="hidden xl:block">
                        <RightPanel />
                    </div>
                </div>

                <footer className="py-6 px-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-4">
                        <span>© 2026 Mesoflix Commodities</span>
                        <div className="w-1.5 h-1.5 bg-gray-700 rounded-full" />
                        <span className="text-teal">Institutional Trading Environment</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]" />
                            <span>System Operational</span>
                        </div>
                        <div className="hidden md:block">
                            <span>Latency: 42ms</span>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Backdrop for mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden transition-all duration-500"
                    onClick={() => setMobileOpen(false)}
                />
            )}
        </div>
    );
}
