"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import TopNav from "@/components/dashboard/TopNav";
import RightPanel from "@/components/dashboard/RightPanel";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { MarketDataProvider } from "@/contexts/MarketDataContext";
import { AutomationProvider } from "@/contexts/AutomationContext";
import { authedFetch } from "@/lib/fetch-utils";


function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setCollapsed] = useState(false);
    const [isMobileOpen, setMobileOpen] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const router = useRouter();

    const fetchUserData = useCallback(async () => {
        // Institutional Bridge: Fetch profile from stable Render backend
        try {
            const RENDER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
            const getCookie = (name: string) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop()?.split(';').shift();
            };
            const token = getCookie('access_token');

            const res = await fetch(`${RENDER_URL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res && res.ok) {
                const data = await res.json();
                setUserData(data?.user);
            } else if (res && res.status === 401) {
                router.push('/login?reason=unauthorized');
            }
        } catch (e) {
            console.error("Auth verification failed", e);
        }
    }, [router]);


    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    return (
        <AutomationProvider>
            <MarketDataProvider>
                <div className="min-h-screen bg-[#0D1B2A] text-white">
                    <Sidebar
                        isCollapsed={isCollapsed}
                        setCollapsed={setCollapsed}
                        isMobileOpen={isMobileOpen}
                        onCloseMobile={() => setMobileOpen(false)}
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

                        <div className="flex relative w-full min-w-0">
                            <main className="flex-1 min-w-0 p-6 md:p-12 animate-in fade-in duration-700">
                                <div className="max-w-7xl mx-auto w-full">
                                    {children}
                                </div>
                            </main>

                            <div className="hidden xl:block">
                                <RightPanel />
                            </div>
                        </div>

                        <footer className="py-6 px-12 border-t border-white/5 flex justify-center items-center text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            <span>© 2026 Mesoflix Commodities</span>
                        </footer>
                    </div>

                    {isMobileOpen && (
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden transition-all duration-500"
                            onClick={() => setMobileOpen(false)}
                        />
                    )}
                </div>
            </MarketDataProvider>
        </AutomationProvider>
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
