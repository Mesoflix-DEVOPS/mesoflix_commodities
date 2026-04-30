"use client";

import { useEffect, useState } from "react";
import { 
    LayoutDashboard, 
    BarChart3, 
    TrendingUp, 
    Megaphone,
    Zap,
    MousePointer2,
    Target,
    Award,
    Loader2,
    ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

export default function CampaignStaffDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await authedFetch("/api/staff/campaigns", router);
                if (res?.ok) {
                    const data = await res.json();
                    setStats(data.campaigns);
                }
            } catch (err) {
                console.error("Failed to load staff overview:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-teal" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing Personnel Dashboard</p>
            </div>
        );
    }

    const totalClicks = stats.reduce((acc, curr) => acc + parseInt(curr.clicks || 0), 0);
    const totalLeads = stats.reduce((acc, curr) => acc + parseInt(curr.leads || 0), 0);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-teal/10 rounded-2xl flex items-center justify-center border border-teal/20">
                            <LayoutDashboard size={24} className="text-teal" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Personnel Terminal</h1>
                            <p className="text-gray-500 text-sm mt-3 max-w-xl leading-relaxed font-medium">
                                Real-time oversight of your active marketing nodes and institutional lead generation performance.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/campaign/dashboard/analytics')} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
                        <BarChart3 size={18} /> Detailed Analytics
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <OverviewCard icon={MousePointer2} label="Reach" value={totalClicks} color="blue" description="Campaign interactions" />
                <OverviewCard icon={Zap} label="Leads" value={totalLeads} color="teal" description="Qualified conversions" />
                <OverviewCard icon={Target} label="Rate" value={`${((totalLeads / (totalClicks || 1)) * 100).toFixed(1)}%`} color="purple" description="Personal efficiency" />
                <OverviewCard icon={Award} label="Level" value="Gold" color="green" description="Partner performance tier" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Active Assignments Summary */}
                <div className="lg:col-span-8 bg-[#0E1B2A] rounded-[3rem] border border-white/5 p-10 shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 space-y-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Active Assignments</h3>
                                <p className="text-gray-500 text-sm mt-1">Deploy your unique referral identities to generate leads.</p>
                            </div>
                            <ArrowUpRight className="text-teal" size={32} />
                        </div>
                        
                        <div className="space-y-4">
                            {stats.slice(0, 3).map((item) => (
                                <div key={item.id} className="group/item flex items-center justify-between p-6 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-3xl transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-teal/10 rounded-2xl flex items-center justify-center text-teal border border-teal/20">
                                            <Megaphone size={20} />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-white">{item.campaign_name}</p>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{item.unique_code}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => router.push('/campaign/dashboard/campaigns')}
                                        className="px-6 py-3 bg-white/5 group-hover/item:bg-teal group-hover/item:text-dark-blue rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Get Link
                                    </button>
                                </div>
                            ))}
                            {stats.length === 0 && (
                                <div className="py-20 flex flex-col items-center justify-center text-gray-700 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/5">
                                    <Megaphone size={48} className="opacity-10 mb-4" />
                                    <p className="font-black text-xs uppercase tracking-widest opacity-40">No active assignments</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                </div>

                {/* Right Side Info Area */}
                <div className="lg:col-span-4 bg-[#0E1B2A] rounded-[3rem] border border-white/5 p-10 shadow-2xl relative overflow-hidden flex flex-col justify-center text-center">
                    <div className="relative z-10 space-y-6">
                        <div className="w-20 h-20 bg-teal/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-teal/20 animate-pulse">
                            <Award size={40} className="text-teal" />
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Tier Progress</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            You are <span className="text-white font-bold">12 leads</span> away from the **Platinum Tier**. Keep deploying your links to unlock premium commissions.
                        </p>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="bg-teal h-full w-[65%]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function OverviewCard({ icon: Icon, label, value, color, description }: any) {
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
        </div>
    );
}
