"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BarChart3,
    Briefcase,
    Globe,
    PieChart,
    History,
    Cpu,
    Settings,
    Headset,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Shield,
    Bell,
    ExternalLink,
    Wallet,
    BookOpen,
    Calendar as CalendarIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuGroups = [
    {
        label: "Primary Navigation",
        items: [
            { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
            { name: "Trading", icon: BarChart3, href: "/dashboard/trading" },
            { name: "Automation", icon: Cpu, href: "/dashboard/automation" },
            { name: "Calendar", icon: CalendarIcon, href: "/dashboard/calendar" },
        ]
    },
    {
        label: "Management",
        items: [
            { name: "Support Hub", icon: Headset, href: "/dashboard/support" },
            { name: "Transactions", icon: History, href: "/dashboard/transactions" },
            { name: "Learn Hub", icon: BookOpen, href: "/dashboard/learn" },
        ]
    }
];

interface SidebarProps {
    isCollapsed: boolean;
    setCollapsed: (val: boolean) => void;
    isMobileOpen: boolean;
    onCloseMobile?: () => void;
}

export default function Sidebar({ isCollapsed, setCollapsed, isMobileOpen, onCloseMobile }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 h-screen bg-[#0A1622] border-r border-white/5 transition-all duration-500 z-[60] flex flex-col",
                isCollapsed ? "w-20" : "w-64",
                isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}
        >
            {/* Logo Section */}
            <div className="h-[70px] border-b border-white/5 flex items-center px-6 gap-3">
                <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-teal to-dark-blue rounded-lg flex items-center justify-center border border-white/10">
                    <span className="text-gold font-bold">M</span>
                </div>
                {!isCollapsed && (
                    <span className="font-bold text-lg tracking-tight text-white whitespace-nowrap">
                        Mesoflix<span className="text-teal">_Pro</span>
                    </span>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-hide">
                {menuGroups.map((group, idx) => (
                    <div key={idx} className="space-y-2">
                        {!isCollapsed && (
                            <p className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">
                                {group.label}
                            </p>
                        )}
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => {
                                            if (onCloseMobile) onCloseMobile();
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative",
                                            isActive
                                                ? "bg-teal/10 text-teal border border-teal/20"
                                                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        <item.icon size={20} className={cn("transition-colors", isActive ? "text-teal" : "group-hover:text-teal")} />
                                        {!isCollapsed && (
                                            <span className="font-medium text-sm">{item.name}</span>
                                        )}
                                        {isActive && !isCollapsed && (
                                            <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_10px_#00BFA6]" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-white/10 space-y-2 bg-black/20">
                <Link
                    href="/dashboard/settings"
                    onClick={() => {
                        if (onCloseMobile) onCloseMobile();
                    }}
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                        pathname === "/dashboard/settings"
                            ? "bg-teal/15 text-teal shadow-[0_0_15px_rgba(0,191,166,0.1)] border border-teal/20"
                            : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                >
                    <Settings size={20} className={cn("transition-colors", pathname === "/dashboard/settings" ? "text-teal" : "group-hover:text-teal")} />
                    {!isCollapsed && <span className="font-bold text-sm">Settings</span>}
                </Link>

                <button
                    onClick={() => setCollapsed(!isCollapsed)}
                    className="hidden md:flex w-full items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group border border-transparent"
                >
                    <div className={cn("transition-transform duration-500", !isCollapsed && "group-hover:-translate-x-1")}>
                        {isCollapsed ? <ChevronRight size={20} className="text-teal" /> : <ChevronLeft size={20} className="text-teal" />}
                    </div>
                    {!isCollapsed && <span className="font-bold text-sm">Collapse Sidebar</span>}
                </button>
            </div>
        </aside>
    );
}
