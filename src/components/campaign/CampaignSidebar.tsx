"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
    LayoutDashboard, 
    Megaphone, 
    BarChart3, 
    FileText, 
    LogOut, 
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    Menu,
    X
} from "lucide-react";
import { useState } from "react";

const campaignMenu = [
    { name: "Overview", icon: LayoutDashboard, href: "/campaign/dashboard" },
    { name: "My Campaigns", icon: Megaphone, href: "/campaign/dashboard/campaigns" },
    { name: "Performance", icon: BarChart3, href: "/campaign/dashboard/analytics" },
    { name: "Marketing Hub", icon: FileText, href: "/campaign/dashboard/resources" },
];

export default function CampaignSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/campaign/staff");
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button 
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-6 left-6 z-[70] p-3 bg-teal/10 border border-teal/20 rounded-xl text-teal backdrop-blur-md"
            >
                <Menu size={20} />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside 
                className={cn(
                    "h-screen bg-[#0A1622] border-r border-white/5 transition-all duration-500 flex flex-col fixed left-0 top-0 z-[90] lg:z-[60]",
                    isCollapsed ? "w-20" : "w-64",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Logo & Close Button (Mobile Only) */}
                <div className="h-[80px] border-b border-white/5 flex items-center px-6 justify-between mb-6">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-gradient-to-br from-teal to-dark-blue rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                            <span className="text-gold font-bold">M</span>
                        </div>
                        {(!isCollapsed || isMobileOpen) && (
                            <span className="font-black text-sm tracking-tight text-white uppercase whitespace-nowrap">
                                Campaign<span className="text-teal">_Staff</span>
                            </span>
                        )}
                    </div>
                    {isMobileOpen && (
                        <button onClick={() => setIsMobileOpen(false)} className="lg:hidden text-gray-500 hover:text-white">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {campaignMenu.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group",
                                    isActive 
                                        ? "bg-teal/10 text-teal border border-teal/20" 
                                        : "text-gray-500 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <item.icon size={20} className={cn("shrink-0", isActive ? "text-teal" : "group-hover:text-white")} />
                                {(!isCollapsed || isMobileOpen) && <span className="font-bold text-sm tracking-tight">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-4">
                    {(!isCollapsed || isMobileOpen) && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck size={14} className="text-teal" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Identity</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium">Your account is secured with end-to-end encryption.</p>
                        </div>
                    )}
                    
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-gray-500 hover:text-red-500 hover:bg-red-500/5 transition-all group"
                    >
                        <LogOut size={20} className="shrink-0 group-hover:text-red-500" />
                        {(!isCollapsed || isMobileOpen) && <span className="font-bold text-sm tracking-tight text-red-500">Logout Terminal</span>}
                    </button>

                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex w-full items-center justify-center p-2 text-gray-700 hover:text-white transition-colors"
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>
            </aside>
        </>
    );
}
