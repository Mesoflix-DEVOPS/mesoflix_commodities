"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
    LayoutDashboard, 
    Megaphone, 
    BarChart3, 
    Users, 
    Award, 
    Settings, 
    LogOut, 
    ChevronLeft,
    ChevronRight,
    Search,
    ShieldAlert,
    Menu,
    X,
    TrendingUp
} from "lucide-react";
import { useState, useEffect } from "react";

const adminMenu = [
    { name: "Overview", icon: LayoutDashboard, href: "/campaign/staff/admin" },
    { name: "Campaign Hub", icon: Megaphone, href: "/campaign/staff/admin#campaigns" },
    { name: "Partner Roster", icon: Users, href: "/campaign/staff/admin#staff" },
    { name: "Live Analytics", icon: TrendingUp, href: "/campaign/staff/admin#analytics" },
];

export default function CampaignAdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/campaign/staff/admin/login");
    };

    // Auto-close mobile menu on path change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0A1622] border-b border-white/5 flex items-center justify-between px-6 z-[70]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center font-bold text-dark-blue">A</div>
                    <span className="font-black text-xs tracking-tighter uppercase">Admin<span className="text-teal">_Command</span></span>
                </div>
                <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 text-gray-400 hover:text-white transition-colors">
                    {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar Desktop */}
            <aside 
                className={cn(
                    "h-screen bg-[#0A1622] border-r border-white/5 transition-all duration-500 flex flex-col fixed left-0 top-0 z-[60]",
                    "hidden lg:flex",
                    isCollapsed ? "w-20" : "w-64"
                )}
            >
                {/* Logo */}
                <div className="h-[80px] border-b border-white/5 flex items-center px-6 gap-3 mb-6 shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-teal to-dark-blue rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                        <Award className="text-gold" size={16} />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col">
                            <span className="font-black text-sm tracking-tight text-white uppercase leading-none">
                                Admin<span className="text-teal">_Command</span>
                            </span>
                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-1">Campaign Center</span>
                        </div>
                    )}
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {adminMenu.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative",
                                    isActive 
                                        ? "bg-teal/10 text-teal border border-teal/20" 
                                        : "text-gray-500 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <item.icon size={20} className={cn("shrink-0", isActive ? "text-teal" : "group-hover:text-white")} />
                                {!isCollapsed && <span className="font-bold text-sm tracking-tight">{item.name}</span>}
                                {!isCollapsed && isActive && (
                                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Tools */}
                <div className="p-4 border-t border-white/5 space-y-4 shrink-0">
                    {!isCollapsed && (
                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldAlert size={14} className="text-red-500" />
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">privileged access</span>
                            </div>
                            <p className="text-[9px] text-gray-600 font-medium">Session is encrypted and audited by central security.</p>
                        </div>
                    )}
                    
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-gray-500 hover:text-red-500 hover:bg-red-500/5 transition-all group"
                    >
                        <LogOut size={20} className="shrink-0 group-hover:text-red-500" />
                        {!isCollapsed && <span className="font-bold text-sm tracking-tight text-red-500">Sign Out</span>}
                    </button>

                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full flex items-center justify-center p-2 text-gray-700 hover:text-white transition-colors"
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={() => setIsMobileOpen(false)} />
            )}

            {/* Mobile Sidebar Content */}
            <aside 
                className={cn(
                    "lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-[#0A1622] z-[90] transition-transform duration-500 ease-in-out border-r border-white/10 flex flex-col",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-16 flex items-center px-6 border-b border-white/5 justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center font-bold text-dark-blue">A</div>
                        <span className="font-black text-xs uppercase tracking-tighter text-white">Admin Command</span>
                    </div>
                    <button onClick={() => setIsMobileOpen(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {adminMenu.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-4 rounded-2xl transition-all",
                                    isActive ? "bg-teal/10 text-teal" : "text-gray-500"
                                )}
                            >
                                <item.icon size={20} />
                                <span className="font-bold text-sm">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-white/5">
                    <button onClick={handleLogout} className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-500/20">
                        Terminate Session
                    </button>
                </div>
            </aside>
        </>
    );
}
