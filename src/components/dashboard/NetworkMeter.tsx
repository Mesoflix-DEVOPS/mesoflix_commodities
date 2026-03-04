"use client";

import { useState, useEffect, useRef } from "react";
import { Wifi, WifiOff, Activity, Zap, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NetworkMeter() {
    const [stats, setStats] = useState({
        rtt: 0,
        downlink: 0,
        effectiveType: "unknown",
        latency: 0, // calculated from manual ping
        status: "Excellent" as "Excellent" | "Fair" | "Poor" | "Disconnected"
    });
    const [showPopup, setShowPopup] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    const checkNetwork = async () => {
        try {
            const start = performance.now();
            // Using a lightweight endpoint for latency checks
            const res = await fetch("/api/health", { method: "HEAD", cache: "no-store" });
            const end = performance.now();
            const latency = Math.round(end - start);

            // Get browser native stats if available
            const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

            let status: any = "Excellent";
            if (latency > 300 || (conn && conn.downlink < 1)) status = "Poor";
            else if (latency > 150 || (conn && conn.downlink < 5)) status = "Fair";

            setStats({
                rtt: conn?.rtt || 0,
                downlink: conn?.downlink || 0,
                effectiveType: conn?.effectiveType || "wifi",
                latency,
                status
            });
        } catch (e) {
            setStats(prev => ({ ...prev, status: "Disconnected" }));
        }
    };

    useEffect(() => {
        checkNetwork();
        const interval = setInterval(checkNetwork, 10000); // Check every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowPopup(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getBars = () => {
        if (stats.status === "Disconnected") return 0;
        if (stats.status === "Poor") return 1;
        if (stats.status === "Fair") return 2;
        return 4;
    };

    return (
        <div className="relative" ref={popupRef}>
            <button
                onClick={() => setShowPopup(!showPopup)}
                className={cn(
                    "p-2 md:p-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 min-w-[40px] md:min-w-[45px]",
                    stats.status === "Excellent" ? "bg-teal/5 border-teal/20 text-teal hover:bg-teal/10" :
                        stats.status === "Fair" ? "bg-amber-500/5 border-amber-500/20 text-amber-500 hover:bg-amber-500/10" :
                            "bg-red-500/5 border-red-500/20 text-red-500 hover:bg-red-500/10"
                )}
                title={`Network: ${stats.status} (${stats.latency}ms)`}
            >
                <div className="flex items-end gap-[2px] h-3 mb-[1px]">
                    {[1, 2, 3, 4].map(idx => (
                        <div
                            key={idx}
                            className={cn(
                                "w-[3px] rounded-full transition-all duration-500",
                                idx === 1 ? "h-1" : idx === 2 ? "h-1.5" : idx === 3 ? "h-2.5" : "h-3",
                                idx <= getBars() ? "bg-current" : "bg-current/20"
                            )}
                        />
                    ))}
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter hidden lg:block">
                    {stats.latency}ms
                </span>
            </button>

            {showPopup && (
                <div className="md:absolute md:right-0 md:mt-3 fixed inset-x-4 top-[80px] md:top-auto md:w-64 bg-[#0E1B2A] border border-white/10 rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200 z-[60]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border",
                            stats.status === "Excellent" ? "bg-teal/10 border-teal/20 text-teal" :
                                stats.status === "Fair" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                    "bg-red-500/10 border-red-500/20 text-red-500"
                        )}>
                            <Wifi size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">Status</p>
                            <h4 className="text-sm font-black text-white">{stats.status} Connectivity</h4>
                        </div>
                    </div>

                    <div className="space-y-3 bg-white/5 rounded-xl p-3 border border-white/5">
                        <StatItem icon={Activity} label="Latency (RTT)" value={`${stats.latency}ms`} color="teal" />
                        <StatItem icon={Zap} label="Estimated Speed" value={`${stats.downlink} Mbps`} color="blue" />
                        <StatItem icon={Info} label="Net Type" value={stats.effectiveType.toUpperCase()} color="amber" />
                        <StatItem icon={ShieldCheck} label="Stability" value={stats.status === "Excellent" ? "Very High" : stats.status === "Fair" ? "High" : "Unstable"} color="green" />
                    </div>

                    <p className="mt-4 text-[9px] text-gray-400 font-medium leading-relaxed px-1">
                        Performance metrics are updated every 10 seconds based on your direct connection to the institutional servers.
                    </p>
                </div>
            )}
        </div>
    );
}

function StatItem({ icon: Icon, label, value, color }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Icon size={12} className={cn(
                    color === 'teal' ? 'text-teal' : color === 'blue' ? 'text-blue-400' : color === 'amber' ? 'text-amber-400' : 'text-green-400'
                )} />
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{label}</span>
            </div>
            <span className="text-xs font-black font-mono text-white">{value}</span>
        </div>
    );
}
