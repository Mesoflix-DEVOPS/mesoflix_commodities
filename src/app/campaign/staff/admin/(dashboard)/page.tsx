"use client";

import { useEffect, useState } from "react";
import { 
    Plus, 
    Users, 
    Award, 
    Settings, 
    Trash2, 
    Edit2, 
    Search,
    ChevronRight,
    TrendingUp,
    Zap,
    Megaphone,
    Loader2,
    X,
    Filter,
    ArrowUpRight,
    MousePointer2,
    Target
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

interface Campaign {
    id: string;
    name: string;
    description: string;
    landing_page_url: string;
    resources: string | null;
    is_active: boolean;
    created_at: string;
}

export default function CampaignMasterAdmin() {
    const [stats, setStats] = useState<GlobalStats>({ clicks: 0, leads: 0 });
    const [staffPerformance, setStaffPerformance] = useState<StaffPerf[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'staff' | 'campaigns'>('overview');
    const router = useRouter();

    const [assignments, setAssignments] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [analyticsRes, campRes, asgnRes] = await Promise.all([
                authedFetch("/api/admin/analytics/global", router),
                authedFetch("/api/admin/campaigns", router),
                authedFetch("/api/admin/assignments", router)
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
            if (asgnRes?.ok) {
                const data = await asgnRes.json();
                setAssignments(data.assignments);
            }
        } catch (err) {
            console.error("Failed to load campaign master data:", err);
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
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing Secure Campaign Registry</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal/10 rounded-xl border border-teal/20">
                            <ShieldAlert className="text-teal" size={20} />
                        </div>
                        <h2 className="text-teal font-black text-[10px] uppercase tracking-widest">Global Marketing Authority</h2>
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">Campaign Command</h1>
                        <p className="text-gray-500 text-sm mt-3 max-w-xl leading-relaxed font-medium">
                            Centralized oversight of institutional distribution, partner performance, and real-time lead attribution.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all">
                        <Filter size={18} /> Advanced Filters
                    </button>
                    <button onClick={fetchData} className="px-6 py-4 bg-teal text-dark-blue rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-teal/20">
                        <TrendingUp size={18} /> Refresh Insight
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

            {/* Tabs Controller */}
            <div className="flex items-center gap-1 bg-[#0A1622] p-1.5 rounded-2xl border border-white/5 w-fit">
                {['overview', 'leads', 'staff', 'campaigns'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                            "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === tab ? "bg-white/10 text-white shadow-xl" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
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
                            <button className="w-full mt-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">View All Protocols</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'leads' && (
                <div className="bg-[#0E1B2A] rounded-[3.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-10 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight">Active Referral Matrix</h3>
                            <p className="text-gray-500 text-sm mt-1">Granular tracking of unique referral links and their attribution.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-teal bg-teal/10 px-4 py-2 rounded-xl border border-teal/20 uppercase tracking-widest">
                                {assignments.length} Active Nodes
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <div className="min-w-[900px]">
                            <table className="w-full text-left">
                            <thead className="bg-[#0A1622]/50 border-b border-white/5">
                                <tr className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                                    <th className="px-10 py-6">Unique Ref. Code</th>
                                    <th className="px-10 py-6">Operator</th>
                                    <th className="px-10 py-6">Campaign Destination</th>
                                    <th className="px-10 py-6">Clicks</th>
                                    <th className="px-10 py-6">Leads</th>
                                    <th className="px-10 py-6 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {assignments.map((asgn) => (
                                    <tr key={asgn.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center text-teal">
                                                    <TrendingUp size={14} />
                                                </div>
                                                <span className="font-mono font-black text-teal text-base">{asgn.unique_code}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <p className="font-bold text-white text-sm">{asgn.staff_name || 'Anonymous'}</p>
                                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{asgn.staff_email}</p>
                                        </td>
                                        <td className="px-10 py-6">
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{asgn.campaign_name}</p>
                                        </td>
                                        <td className="px-10 py-6 font-mono text-gray-400 font-bold">{asgn.clicks}</td>
                                        <td className="px-10 py-6 font-mono text-white font-black">{asgn.leads}</td>
                                        <td className="px-10 py-6 text-right">
                                            <span className="px-3 py-1 bg-teal/10 text-teal rounded-full text-[9px] font-black uppercase tracking-widest border border-teal/20">Active</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'staff' && (
                <div className="bg-[#0E1B2A] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                        <h3 className="text-2xl font-black text-white">Partner Performance Matrix</h3>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <div className="min-w-[900px]">
                            <table className="w-full text-left">
                            <thead className="bg-[#0A1622] border-b border-white/5">
                                <tr className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                                    <th className="px-10 py-6">Operator</th>
                                    <th className="px-10 py-6">Cluster/Campaign</th>
                                    <th className="px-10 py-6">Reach</th>
                                    <th className="px-10 py-6">Qualified Leads</th>
                                    <th className="px-10 py-6 text-right">Ratio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {staffPerformance.map((perf) => (
                                    <tr key={`${perf.staff_id}-${perf.campaign_id}`} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-teal/10 border border-teal/20 flex items-center justify-center font-black text-teal text-xs">
                                                    {perf.staff_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white leading-none">{perf.staff_name}</p>
                                                    <p className="text-[10px] text-gray-500 mt-2">{perf.staff_email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-tighter">
                                                {perf.campaign_name}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 font-mono text-white text-lg font-black">{perf.clicks}</td>
                                        <td className="px-10 py-6 font-mono text-teal text-lg font-black">{perf.leads}</td>
                                        <td className="px-10 py-6 text-right font-mono text-xl font-black text-white">
                                            {((perf.leads / (perf.clicks || 1)) * 100).toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Management Tab (Expanded) */}
            {activeTab === 'campaigns' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map(camp => (
                        <div key={camp.id} className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-8 shadow-xl hover:border-teal/30 transition-all group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                                    <Megaphone size={24} />
                                </div>
                                <span className={cn(
                                    "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
                                    camp.is_active ? "text-teal border-teal/20 bg-teal/5" : "text-gray-500 border-white/10 bg-white/5"
                                )}>
                                    {camp.is_active ? 'Priority' : 'Archived'}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 leading-tight">{camp.name}</h3>
                            <p className="text-gray-500 text-sm mb-8 line-clamp-3 leading-relaxed flex-grow">{camp.description}</p>
                            
                            <div className="space-y-4 pt-6 border-t border-white/5">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-gray-600">Performance</span>
                                    <span className="text-white">Live Data Only</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                        Configure
                                    </button>
                                    <button className="flex-1 py-3 bg-teal text-dark-blue rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                        Assign
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button className="bg-transparent border-2 border-dashed border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-gray-600 hover:text-teal hover:border-teal/30 transition-all group min-h-[300px]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-teal/10 transition-all">
                            <Plus size={32} />
                        </div>
                        <p className="font-black text-sm uppercase tracking-widest">Initialize New Protocol</p>
                    </button>
                </div>
            )}
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

function ShieldAlert(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
        </svg>
    );
}

function Placeholder({ text }: { text: string }) {
    return (
        <div className="py-20 flex flex-col items-center justify-center text-gray-700 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/5">
            <TrendingUp size={48} className="opacity-10 mb-4" />
            <p className="font-black text-xs uppercase tracking-widest opacity-40">{text}</p>
        </div>
    );
}
