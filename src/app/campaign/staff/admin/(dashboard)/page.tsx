"use client";

import { useEffect, useState } from "react";
import { 
    Plus, 
    Award, 
    TrendingUp,
    Zap,
    Megaphone,
    Loader2,
    ArrowUpRight,
    MousePointer2,
    Target,
    ShieldAlert as ShieldIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

interface GlobalStats {
    clicks: number;
    leads: number;
}

interface StaffPerf {
    staff_id: string;
    staff_name: string;
    staff_email: string;
    campaign_id: string;
    campaign_name: string;
    clicks: number;
    leads: number;
}

export default function CampaignMasterAdmin() {
    const router = useRouter();
    const [stats, setStats] = useState<GlobalStats>({ clicks: 0, leads: 0 });
    const [staffPerformance, setStaffPerformance] = useState<StaffPerf[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [analyticsRes, campRes] = await Promise.all([
                authedFetch("/api/admin/analytics/global", router),
                authedFetch("/api/admin/campaigns", router)
            ]);

            if (analyticsRes?.ok) {
                const data = await analyticsRes.json();
                setStats(data.stats);
                setStaffPerformance(data.staffPerformance);
            }
            if (campRes?.ok) {
                const data = await campRes.json();
                setCampaigns(data.campaigns);
            }
        } catch (err) {
            console.error("Failed to load command center overview:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-teal" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing Command Center Overview</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-teal/10 rounded-2xl flex items-center justify-center border border-teal/20">
                            <ShieldIcon size={24} className="text-teal" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Campaign Command</h1>
                            <p className="text-gray-500 text-sm mt-3 max-w-xl leading-relaxed font-medium">
                                Centralized oversight of institutional distribution, partner performance, and real-time lead attribution.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/campaign/staff/admin/campaigns')} className="px-8 py-4 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center gap-2 shadow-xl shadow-teal/20">
                        <Plus size={16} /> New Protocol
                    </button>
                </div>
            </div>

            {/* Global Matrix Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MatrixCard icon={MousePointer2} label="Global Impressions" value={stats.clicks} color="blue" description="Total link interactions" />
                <MatrixCard icon={Zap} label="Verified Leads" value={stats.leads} color="teal" description="Qualified institutional leads" />
                <MatrixCard icon={Target} label="Ad Conversion" value={`${((stats.leads / (stats.clicks || 1)) * 100).toFixed(1)}%`} color="purple" description="Performance efficiency" />
                <MatrixCard icon={Award} label="System Reach" value="International" color="green" description="Across global clusters" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Performance Trends Summary */}
                <div className="lg:col-span-8 bg-[#0E1B2A] rounded-[3rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 space-y-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Staff Efficiency Matrix</h3>
                                <p className="text-gray-500 text-sm mt-1">Real-time performance ranking across all active partners.</p>
                            </div>
                            <ArrowUpRight className="text-teal" size={32} />
                        </div>
                        
                        <div className="space-y-4">
                            {staffPerformance.slice(0, 5).map((perf, i) => (
                                <div key={`${perf.staff_id}-${perf.campaign_id}`} className="group/item flex items-center justify-between p-6 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-3xl transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border border-white/10",
                                            i === 0 ? "bg-teal/20 text-teal border-teal/20" : "bg-white/5 text-gray-400"
                                        )}>
                                            0{i + 1}
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-white">{perf.staff_name || 'System Operator'}</p>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{perf.campaign_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12 text-right">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Leads</p>
                                            <p className="text-xl font-black text-teal font-mono">{perf.leads}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Conv.</p>
                                            <p className="text-xl font-black text-white font-mono">{((perf.leads / (perf.clicks || 1)) * 100).toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {staffPerformance.length === 0 && <Placeholder text="No performance data available" />}
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal/5 blur-[100px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-teal/10" />
                </div>

                {/* Quick Access Sidebar Area */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#0E1B2A] rounded-[3rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden h-full">
                        <h3 className="text-xl font-black text-white tracking-tight mb-8">Active Deployments</h3>
                        <div className="space-y-4">
                            {campaigns.slice(0, 4).map((camp) => (
                                <div key={camp.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/10 shrink-0">
                                        <Megaphone size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{camp.name}</p>
                                        <p className="text-[10px] text-gray-500 font-mono mt-1">ID: {camp.id.split('-')[0]}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => router.push('/campaign/staff/admin/campaigns')} className="w-full mt-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">View All Protocols</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MatrixCard({ icon: Icon, label, value, color, description }: any) {
    const colorMap: any = {
        blue: "text-blue-500 border-blue-500/20 bg-blue-500/5",
        teal: "text-teal border-teal/20 bg-teal/5",
        purple: "text-purple-500 border-purple-500/20 bg-purple-500/5",
        green: "text-green-500 border-green-500/20 bg-green-500/5"
    };

    return (
        <div className={cn("p-8 rounded-[2.5rem] border relative overflow-hidden group hover:scale-[1.02] transition-all duration-500", colorMap[color])}>
            <div className="bg-[#0A1622] w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                <Icon size={24} />
            </div>
            <p className="text-3xl font-black text-white font-mono tracking-tighter">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mt-2">{label}</p>
            <p className="text-[10px] font-medium text-white/30 mt-1">{description}</p>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        </div>
    );
}

function Placeholder({ text }: { text: string }) {
    return (
        <div className="py-20 flex flex-col items-center justify-center text-gray-700 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/5 w-full">
            <TrendingUp size={48} className="opacity-10 mb-4" />
            <p className="font-black text-xs uppercase tracking-widest opacity-40">{text}</p>
        </div>
    );
}
