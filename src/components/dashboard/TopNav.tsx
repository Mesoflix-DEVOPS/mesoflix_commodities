"use client";

import { Bell, Search, Settings, User, TrendingUp, Menu, X, LogOut, Loader2, CheckCircle2, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useMarketData } from "@/contexts/MarketDataContext";
import NetworkMeter from "./NetworkMeter";

interface TopNavProps {
    userName: string;
    onMenuClick: () => void;
    isMobileOpen: boolean;
}

export default function TopNav({
    userName,
    onMenuClick,
    isMobileOpen,
}: TopNavProps) {
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Consume real-time context
    const { mode, setMode, balanceData, connectionStatus } = useMarketData();

    // Fetch Notifications
    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (e) { console.error("Error fetching notifications", e); }
    };

    // Poll every 15 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    // Handle outside click to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (id: string | null = null, markAll = false) => {
        try {
            const body: any = {};
            if (markAll) body.markAll = true;
            else if (id) body.ids = [id];

            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            fetchNotifications();
        } catch (e) {
            console.error("Failed to mark as read", e);
        }
    };

    const handleAccountSelect = async (acc: any) => {
        try {
            const res = await fetch('/api/capital/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId: acc.accountId,
                    accountType: acc.accountType
                })
            });
            if (res.ok) {
                // Refresh stream and all relative context UI
                window.location.reload();
            }
        } catch (e) { console.error("Switch failed", e); }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={16} className="text-green-400" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-400" />;
            case 'error': return <AlertCircle size={16} className="text-red-400" />;
            default: return <Info size={16} className="text-teal" />;
        }
    };

    return (
        <header className="h-[70px] bg-[#0A1622]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 flex items-center justify-between px-4 md:px-12 transition-all">
            <div className="flex items-center gap-2 md:gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 md:hidden text-gray-400 hover:text-white bg-white/5 rounded-lg border border-white/10"
                >
                    {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                {/* Account Mode Switcher */}
                <div className="flex items-center bg-black/20 p-1 rounded-xl border border-white/5 ml-1 md:ml-2">
                    <button
                        onClick={() => setMode("demo")}
                        className={cn(
                            "px-2.5 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-1.5 md:gap-2",
                            mode === "demo"
                                ? "bg-teal text-dark-blue shadow-lg"
                                : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        {mode === "demo" && connectionStatus === 'connecting' && <Loader2 size={10} className="animate-spin" />}
                        Demo
                    </button>
                    <button
                        onClick={() => setMode("real")}
                        className={cn(
                            "px-2.5 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-1.5 md:gap-2",
                            mode === "real"
                                ? "bg-amber-500 text-dark-blue shadow-lg"
                                : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        {mode === "real" && connectionStatus === 'connecting' && <Loader2 size={10} className="animate-spin" />}
                        Real
                    </button>
                </div>
            </div>

            {/* Center - Global Search (Visual Only for now) */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search assets, engines, or history..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-300 focus:outline-none focus:border-teal/30 focus:bg-white/10 transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                {/* Equity Snapshot (Reduced for Mobile) */}
                <div className="hidden sm:flex flex-col items-end mr-2">
                    <span className="text-[10px] text-teal font-bold uppercase tracking-widest leading-none mb-1">Total Equity</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">
                            {balanceData && typeof balanceData.equity === 'number' ? `$ ${balanceData.equity.toLocaleString()}` : "$ --.--"}
                        </span>
                        <div className={cn("flex items-center text-[10px] px-1.5 py-0.5 rounded",
                            balanceData?.profitLoss && balanceData.profitLoss > 0 ? "text-green-500 bg-green-500/10" :
                                balanceData?.profitLoss && balanceData.profitLoss < 0 ? "text-red-500 bg-red-500/10" :
                                    "text-gray-500 bg-white/5"
                        )}>
                            <TrendingUp size={10} className={cn("mr-0.5", balanceData?.profitLoss && balanceData.profitLoss < 0 ? "rotate-90 text-red-500" : "")} />
                            <span>{balanceData?.profitLoss ? `$${balanceData.profitLoss}` : "0"}</span>
                        </div>
                    </div>
                </div>

                <div className="h-8 w-px bg-white/5 hidden md:block" />

                <div className="flex items-center gap-1.5 md:gap-3">
                    <NetworkMeter />
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                            className="p-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all relative"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <div className="absolute top-2 right-2 w-2 h-2 bg-teal border-2 border-[#0A1622] rounded-full animate-pulse" />
                            )}
                        </button>

                        {/* Notifications Panel */}
                        {showNotifications && (
                            <div className="md:absolute md:right-0 md:mt-3 max-md:fixed max-md:inset-x-4 max-md:top-[80px] md:w-80 max-h-[400px] overflow-hidden flex flex-col bg-[#0E1B2A] border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 z-50">
                                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between z-10 bg-[#0E1B2A]">
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Activity Log</p>
                                        <p className="text-sm font-bold text-white leading-none">Notifications</p>
                                    </div>
                                    {unreadCount > 0 && (
                                        <button onClick={() => markAsRead(null, true)} className="text-[10px] text-teal hover:underline font-semibold uppercase">
                                            Mark All Read
                                        </button>
                                    )}
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-gray-500">No recent notifications.</div>
                                    ) : (
                                        notifications.map((notif: any) => (
                                            <div
                                                key={notif.id}
                                                className={cn(
                                                    "p-3 rounded-xl transition-all border flex gap-3 text-left",
                                                    !notif.read ? "bg-teal/5 border-teal/10" : "bg-transparent border-transparent hover:bg-white/5"
                                                )}
                                                onClick={() => !notif.read && markAsRead(notif.id)}
                                                style={{ cursor: !notif.read ? 'pointer' : 'default' }}
                                            >
                                                <div className="mt-0.5">{getIconForType(notif.type)}</div>
                                                <div className="flex-1">
                                                    <p className={cn("text-xs font-bold", !notif.read ? "text-white" : "text-gray-300")}>{notif.title}</p>
                                                    <p className="text-[11px] text-gray-500 leading-snug mt-1">{notif.message}</p>
                                                </div>
                                                {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1 flex-shrink-0" />}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                            className="flex items-center gap-3 pl-1 pr-3 py-1 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-teal/20 flex items-center justify-center border border-teal/30 text-teal font-bold text-xs group-hover:bg-teal group-hover:text-dark-blue transition-all">
                                {userName?.[0] || 'U'}
                            </div>
                            <span className="text-xs font-semibold text-gray-300 hidden md:block">{userName || 'Trader'}</span>
                        </button>

                        {showProfile && (
                            <div className="absolute right-0 mt-3 w-56 bg-[#0E1B2A] border border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-3 py-3 border-b border-white/5">
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">My Account</p>
                                    <p className="text-sm font-bold text-white truncate">{userName}</p>
                                </div>
                                <div className="p-1 space-y-1 mt-1">
                                    <ProfileLink href="/dashboard/settings" icon={User}>Profile Settings</ProfileLink>
                                    <ProfileLink href="/dashboard/settings?tab=security" icon={Settings}>Security</ProfileLink>
                                    <button
                                        onClick={async () => {
                                            await fetch("/api/auth/logout", { method: "POST" });
                                            window.location.href = "/login?logged_out=true";
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-xl transition-all mt-1"
                                    >
                                        <LogOut size={16} />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

function ProfileLink({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
        >
            <Icon size={16} />
            <span>{children}</span>
        </Link>
    );
}
