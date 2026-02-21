"use client";

import { Bell, Search, Settings, User, TrendingUp, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TopNavProps {
    userName: string;
    onMenuClick: () => void;
    isMobileOpen: boolean;
    accountType: "demo" | "real";
    onAccountTypeChange: (type: "demo" | "real") => void;
}

export default function TopNav({
    userName,
    onMenuClick,
    isMobileOpen,
    accountType,
    onAccountTypeChange
}: TopNavProps) {
    const [showProfile, setShowProfile] = useState(false);

    return (
        <header className="h-[70px] bg-[#0A1622]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 flex items-center justify-between px-6 md:px-12">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 md:hidden text-gray-400 hover:text-white bg-white/5 rounded-lg border border-white/10"
                >
                    {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                {/* Account Mode Switcher */}
                <div className="flex items-center bg-black/20 p-1 rounded-xl border border-white/5 ml-2">
                    <button
                        onClick={() => onAccountTypeChange("demo")}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                            accountType === "demo"
                                ? "bg-teal text-dark-blue shadow-lg"
                                : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        Demo
                    </button>
                    <button
                        onClick={() => onAccountTypeChange("real")}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                            accountType === "real"
                                ? "bg-amber-500 text-dark-blue shadow-lg"
                                : "text-gray-500 hover:text-gray-300"
                        )}
                    >
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
                        <span className="text-sm font-bold text-white font-mono">$ --.--</span>
                        <div className="flex items-center text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                            <TrendingUp size={10} className="mr-0.5" />
                            <span>--%</span>
                        </div>
                    </div>
                </div>

                <div className="h-8 w-px bg-white/5 hidden sm:block" />

                <div className="flex items-center gap-2">
                    <button className="p-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all relative">
                        <Bell size={20} />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-teal border-2 border-[#0A1622] rounded-full" />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowProfile(!showProfile)}
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
                                        onClick={() => fetch("/api/auth/logout", { method: "POST" }).then(() => window.location.href = "/login")}
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
