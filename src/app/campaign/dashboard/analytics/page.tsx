"use client";

import { useEffect, useState } from "react";
import { 
    BarChart3,
    Loader2,
    TrendingUp,
    Zap,
    Target,
    MousePointer2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

export default function StaffAnalyticsPage() {
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
                console.error("Failed to load staff performance:", err);
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
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Processing Performance Insight</p>
            </div>
        );
    }

    const totalClicks = stats.reduce((acc, curr) => acc + parseInt(curr.clicks || 0), 0);
    const totalLeads = stats.reduce((acc, curr) => acc + parseInt(curr.leads || 0), 0);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Performance Analytics</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Real-time Attribution & Conversion Matrix</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={MousePointer2} label="Total Impressions" value={totalClicks} color="blue" />
                <StatCard icon={Zap} label="Verified Leads" value={totalLeads} color="teal" />
                <StatCard icon={Target} label="Conversion Ratio" value={`${((totalLeads / (totalClicks || 1)) * 100).toFixed(1)}%`} color="purple" />
            </div>

            <div className="bg-[#0E1B2A] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-10 border-b border-white/5 bg-white/[0.01]">
                    <h3 className="text-2xl font-black text-white tracking-tight">Campaign Breakdown</h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <div className="min-w-[800px]">
                        <table className="w-full text-left">
                            <thead className="bg-[#0A1622]/50 border-b border-white/5">
                                <tr className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                                    <th className="px-10 py-6">Active Deployment</th>
                                    <th className="px-10 py-6 text-center">Impressions</th>
                                    <th className="px-10 py-6 text-center">Leads</th>
                                    <th className="px-10 py-6 text-right">Conversion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-10 py-6">
                                            <p className="font-black text-white text-base">{item.campaign_name}</p>
                                            <p className="text-[10px] text-teal font-black uppercase tracking-widest mt-1">{item.unique_code}</p>
                                        </td>
                                        <td className="px-10 py-6 text-center font-mono text-gray-400 font-bold">{item.clicks}</td>
                                        <td className="px-10 py-6 text-center font-mono text-white font-black">{item.leads}</td>
                                        <td className="px-10 py-6 text-right">
                                            <span className="text-lg font-black text-white font-mono">
                                                {((item.leads / (item.clicks || 1)) * 100).toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: any) {
    const colorMap: any = {
        blue: "text-blue-500 border-blue-500/10 bg-blue-500/5",
        teal: "text-teal border-teal/10 bg-teal/5",
        purple: "text-purple-500 border-purple-500/10 bg-purple-500/5"
    };

    return (
        <div className={cn("p-8 rounded-[2.5rem] border flex items-center gap-6", colorMap[color])}>
            <div className="w-14 h-14 bg-[#0A1622] rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                <Icon size={28} />
            </div>
            <div>
                <p className="text-3xl font-black text-white font-mono tracking-tighter">{value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-1">{label}</p>
            </div>
        </div>
    );
}
