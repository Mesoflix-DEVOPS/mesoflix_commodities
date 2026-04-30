"use client";

import { useEffect, useState } from "react";
import { 
    TrendingUp,
    Users,
    Zap,
    MousePointer2,
    Target,
    Loader2,
    ArrowLeft,
    Megaphone,
    Copy,
    Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

export default function CampaignMissionControl({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [campaign, setCampaign] = useState<any>(null);
    const [performance, setPerformance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [campRes, perfRes, usersRes] = await Promise.all([
                authedFetch(`/api/admin/campaigns/${params.id}`, router),
                authedFetch(`/api/admin/analytics/campaign/${params.id}`, router),
                authedFetch("/api/admin/users", router)
            ]);

            if (campRes?.ok) {
                const data = await campRes.json();
                setCampaign(data.campaign);
            }
            if (perfRes?.ok) {
                const data = await perfRes.json();
                setPerformance(data.performance);
            }
            if (usersRes?.ok) {
                const data = await usersRes.json();
                setAllUsers(data.users);
            }
        } catch (err) {
            console.error("Failed to load mission control data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id, router]);

    const handleAssignStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaffId) return;
        setIsAssigning(true);
        try {
            const res = await authedFetch("/api/admin/assignments", router, {
                method: "POST",
                body: JSON.stringify({
                    campaign_id: params.id,
                    staff_id: selectedStaffId
                })
            });
            if (res?.ok) {
                setIsAssignModalOpen(false);
                setSelectedStaffId('');
                await fetchData();
            }
        } catch (err) {
            console.error("Assignment Failure:", err);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleCopyLink = (code: string) => {
        const url = `${window.location.origin}/c/${code}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-teal" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing Deployment Intelligence</p>
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="text-center py-20">
                <p className="text-white font-black uppercase tracking-widest">Protocol ID Not Found</p>
                <button onClick={() => router.back()} className="mt-4 text-teal text-xs font-bold uppercase tracking-widest">← Return to Hub</button>
            </div>
        );
    }

    const totalClicks = performance.reduce((acc, curr) => acc + parseInt(curr.clicks || 0), 0);
    const totalLeads = performance.reduce((acc, curr) => acc + parseInt(curr.leads || 0), 0);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                        <ArrowLeft size={14} /> Back to Hub
                    </button>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">{campaign.name}</h1>
                        <p className="text-gray-500 text-sm mt-3 max-w-xl leading-relaxed font-medium uppercase tracking-widest text-[10px]">
                            Deployment ID: {campaign.id}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Status</p>
                        <p className="text-teal font-black text-xs uppercase tracking-widest mt-1">Live Deployment</p>
                    </div>
                    <button 
                        onClick={() => setIsAssignModalOpen(true)}
                        className="w-12 h-12 bg-teal/10 border border-teal/20 rounded-2xl flex items-center justify-center text-teal hover:bg-teal hover:text-dark-blue transition-all"
                    >
                        <Users size={20} />
                    </button>
                </div>
            </div>

            {/* Modal: Assign Staff Directly */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAssignModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-[#0A1622] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Link Partner</h3>
                                <p className="text-gray-500 text-sm mt-1">Assign an operator to this protocol.</p>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X /></button>
                        </div>

                        <form onSubmit={handleAssignStaff} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Select Staff Identity</label>
                                <select 
                                    required
                                    value={selectedStaffId}
                                    onChange={(e) => setSelectedStaffId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-teal/50 transition-all appearance-none"
                                >
                                    <option value="" className="bg-[#0A1622]">Choose staff member...</option>
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id} className="bg-[#0A1622]">{u.full_name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                disabled={isAssigning}
                                className="w-full py-5 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl"
                            >
                                {isAssigning ? <Loader2 className="animate-spin mx-auto" /> : "Authorize Deployment Link"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Matrix Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={MousePointer2} label="Total Impressions" value={totalClicks} color="blue" />
                <StatCard icon={Zap} label="Verified Leads" value={totalLeads} color="teal" />
                <StatCard icon={Target} label="Conversion Efficiency" value={`${((totalLeads / (totalClicks || 1)) * 100).toFixed(1)}%`} color="purple" />
                <StatCard icon={Users} label="Active Partners" value={performance.length} color="green" />
            </div>

            {/* Partner Performance Table */}
            <div className="bg-[#0E1B2A] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-10 border-b border-white/5 bg-white/[0.01]">
                    <h3 className="text-2xl font-black text-white tracking-tight">Partner Performance Matrix</h3>
                    <p className="text-gray-500 text-sm mt-1">Granular oversight of staff distribution for this specific cluster.</p>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <div className="min-w-[900px]">
                        <table className="w-full text-left">
                            <thead className="bg-[#0A1622]/50 border-b border-white/5">
                                <tr className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                                    <th className="px-10 py-6">Operator</th>
                                    <th className="px-10 py-6">Live Deployment Link</th>
                                    <th className="px-10 py-6 text-center">Impressions</th>
                                    <th className="px-10 py-6 text-center">Leads</th>
                                    <th className="px-10 py-6 text-right">Conversion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {performance.map((perf) => (
                                    <tr key={perf.staff_id} className="hover:bg-white/[0.02] transition-colors group">
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
                                            <div className="flex items-center gap-3">
                                                <code className="font-mono font-black text-teal text-[11px] bg-teal/5 px-3 py-1.5 rounded-lg border border-teal/10">
                                                    /c/{perf.custom_alias || perf.unique_code}
                                                </code>
                                                <button 
                                                    onClick={() => handleCopyLink(perf.custom_alias || perf.unique_code)}
                                                    className="p-2 text-gray-600 hover:text-white transition-colors"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-center font-mono text-gray-400 font-bold">{perf.clicks}</td>
                                        <td className="px-10 py-6 text-center font-mono text-white font-black">{perf.leads}</td>
                                        <td className="px-10 py-6 text-right font-mono text-lg font-black text-white">
                                            {((perf.leads / (perf.clicks || 1)) * 100).toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                                {performance.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <TrendingUp size={48} className="opacity-10 mx-auto mb-4" />
                                            <p className="font-black text-[10px] uppercase tracking-widest text-gray-700">No partner data attributed to this protocol</p>
                                        </td>
                                    </tr>
                                )}
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
        purple: "text-purple-500 border-purple-500/10 bg-purple-500/5",
        green: "text-green-500 border-green-500/10 bg-green-500/5"
    };

    return (
        <div className={cn("p-8 rounded-[2.5rem] border flex flex-col gap-6", colorMap[color])}>
            <div className="w-12 h-12 bg-[#0A1622] rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                <Icon size={24} />
            </div>
            <div>
                <p className="text-3xl font-black text-white font-mono tracking-tighter leading-none">{value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-3">{label}</p>
            </div>
        </div>
    );
}
