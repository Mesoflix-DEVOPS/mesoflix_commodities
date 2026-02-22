"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import TopNav from "@/components/dashboard/TopNav";
import RightPanel from "@/components/dashboard/RightPanel";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setCollapsed] = useState(false);
    const [isMobileOpen, setMobileOpen] = useState(false);
    const [userData, setUserData] = useState<any>(null);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode") || "demo";

    const handleAccountTypeChange = (type: "demo" | "real") => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("mode", type);
        router.push(`${pathname}?${params.toString()}`);
    };

    useEffect(() => {
        // Shared but lightweight user fetch for the shell
        // Passing mode ensures we don't trigger a 401 from a mismatched session
        fetch(`/api/dashboard?mode=${mode}`)
            .then(res => res.json())
            .then(data => setUserData(data?.user))
            .catch(() => { });
    }, [mode]);

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
                    accountType={mode as "demo" | "real"}
                    onAccountTypeChange={handleAccountTypeChange}
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

                <footer className="py-6 px-12 border-t border-white/5 flex justify-center items-center text-gray-500 text-[10px] font-black uppercase tracking-widest">
                    <span>© 2026 Mesoflix Commodities</span>
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-teal/20 border-t-teal rounded-full animate-spin"></div>
            </div>
        }>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </Suspense>
    );
}
