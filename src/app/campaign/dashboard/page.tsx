"use client";

import { useEffect, useState } from "react";
import { 
    Megaphone, 
    BarChart3, 
    Download, 
    Copy, 
    ExternalLink, 
    ChevronRight, 
    Activity, 
    Users, 
    Zap, 
    Image as ImageIcon, 
    Video, 
    FileText,
    CheckCircle2,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

interface CampaignItem {
    id: string;
    unique_code: string;
    short_url: string;
    status: string;
    campaign_id: string;
    campaign_name: string;
    campaign_description: string;
    landing_page: string;
    resources: string | null;
    clicks: number;
    leads: number;
}

export default function StaffCampaignDashboard() {
    const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignItem | null>(null);
    const [copying, setCopying] = useState<string | null>(null);
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/campaign/staff");
    };

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const res = await authedFetch("/api/staff/campaigns", router);
                if (res && res.ok) {
                    const data = await res.json();
                    setCampaigns(data.campaigns);
                    if (data.campaigns.length > 0) {
                        setSelectedCampaign(data.campaigns[0]);
                    }
                }
            } catch (err) {
                console.error("Failed to load campaigns:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
    }, [router]);

    const handleCopyLink = (code: string) => {
        const url = `${window.location.origin}/c/${code}`;
        navigator.clipboard.writeText(url);
        setCopying(code);
        setTimeout(() => setCopying(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-teal" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Initializing Campaign Environment</p>
            </div>
        );
    }

    if (campaigns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-dashed border-white/10">
                    <Megaphone className="w-8 h-8 text-gray-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">No Active Campaigns</h2>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">You haven't been assigned to any advertising campaigns yet. Contact your administrator to get started.</p>
                </div>
            </div>
        );
    }

    const resources = selectedCampaign?.resources ? JSON.parse(selectedCampaign.resources) : { images: [], videos: [], copy: [] };

    return (
        <div className="min-h-screen pb-20 bg-[#06111C]">
            {/* Local TopNav */}
            <nav className="h-[80px] px-8 border-b border-white/5 flex items-center justify-between bg-[#0A1622]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-teal to-dark-blue rounded-lg flex items-center justify-center border border-white/10">
                        <span className="text-gold font-bold text-xs">M</span>
                    </div>
                    <span className="font-black text-sm tracking-tight text-white uppercase">
                        Campaign<span className="text-teal">_Staff</span>
                    </span>
                </div>
                <button 
                    onClick={handleLogout}
                    className="px-5 py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 hover:border-red-500/20 transition-all"
                >
                    Logout Terminal
                </button>
            </nav>

            <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                            <span className="text-teal font-black text-[10px] uppercase tracking-widest">Active Marketing Partner</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Campaign Intelligence</h1>
                        <p className="text-gray-500 text-sm">Professional advertising tools and real-time performance tracking.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-[#0A1622] p-2 rounded-2xl border border-white/5">
                        <div className="px-4 py-2 text-right border-r border-white/5">
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Total Reach</p>
                            <p className="text-lg font-black text-white font-mono">{campaigns.reduce((s, c) => s + c.clicks, 0)}</p>
                        </div>
                        <div className="px-4 py-2 text-right">
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Conversion Rate</p>
                            <p className="text-lg font-black text-teal font-mono">
                                {((campaigns.reduce((s, c) => s + c.leads, 0) / (campaigns.reduce((s, c) => s + c.clicks, 0) || 1)) * 100).toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Campaign Selection & List */}
                    <div className="lg:col-span-4 space-y-4">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Your Campaigns</h3>
                        <div className="space-y-3">
                            {campaigns.map((camp) => (
                                <button
                                    key={camp.id}
                                    onClick={() => setSelectedCampaign(camp)}
                                    className={cn(
                                        "w-full text-left p-6 rounded-[2rem] border transition-all duration-300 relative group overflow-hidden",
                                        selectedCampaign?.id === camp.id 
                                            ? "bg-teal/10 border-teal/30 shadow-[0_0_20px_rgba(0,191,166,0.05)]" 
                                            : "bg-[#0A1622] border-white/5 hover:border-white/10"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-bold text-white tracking-tight group-hover:text-teal transition-colors">{camp.campaign_name}</h4>
                                        <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border", 
                                            camp.status === 'active' ? "text-teal border-teal/20 bg-teal/5" : "text-gray-500 border-white/10 bg-white/5"
                                        )}>{camp.status}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Clicks</p>
                                            <p className="text-lg font-black text-white font-mono">{camp.clicks}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Leads</p>
                                            <p className="text-lg font-black text-teal font-mono">{camp.leads}</p>
                                        </div>
                                    </div>
                                    {selectedCampaign?.id === camp.id && (
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-teal/5 rounded-full blur-2xl -mr-8 -mt-8" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Campaign Details & Resources */}
                    <div className="lg:col-span-8 space-y-6">
                        {selectedCampaign && (
                            <>
                                {/* Performance Breakdown */}
                                <div className="bg-[#0E1B2A] p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-8">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div>
                                            <h3 className="text-2xl font-black text-white tracking-tight">{selectedCampaign.campaign_name}</h3>
                                            <p className="text-gray-400 text-sm mt-2 leading-relaxed">{selectedCampaign.campaign_description}</p>
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-3">
                                            <button 
                                                onClick={() => handleCopyLink(selectedCampaign.unique_code)}
                                                className={cn(
                                                    "px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all",
                                                    copying === selectedCampaign.unique_code 
                                                        ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                                                        : "bg-teal hover:bg-[#00b39b] text-[#0A1622] shadow-[0_0_20px_rgba(0,191,166,0.2)]"
                                                )}
                                            >
                                                {copying === selectedCampaign.unique_code ? (
                                                    <><CheckCircle2 size={16} /> Link Copied</>
                                                ) : (
                                                    <><Copy size={16} /> Copy Campaign Link</>
                                                )}
                                            </button>
                                            <p className="text-[10px] text-gray-500 font-mono">ID: {selectedCampaign.unique_code}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                        <StatBox icon={Activity} label="Click Analytics" value={selectedCampaign.clicks} unit="REACH" color="blue" />
                                        <StatBox icon={Users} label="Lead Generation" value={selectedCampaign.leads} unit="USERS" color="teal" />
                                        <StatBox icon={Zap} label="Conversion" value={`${((selectedCampaign.leads / (selectedCampaign.clicks || 1)) * 100).toFixed(1)}%`} unit="RATIO" color="purple" />
                                    </div>
                                </div>

                                {/* Marketing Toolset */}
                                <div className="bg-[#0E1B2A] p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Megaphone size={14} className="text-teal" /> Marketing Toolset
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Visual Assets */}
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                <ImageIcon size={16} className="text-blue-400" /> Visual Assets
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                {resources.images.length > 0 ? resources.images.map((img: string, i: number) => (
                                                    <div key={i} className="group relative aspect-video bg-black/20 rounded-xl overflow-hidden border border-white/5 hover:border-teal/30 transition-all">
                                                        <img src={img} alt="Marketing Asset" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />
                                                        <button className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all">
                                                            <Download className="text-white" size={20} />
                                                        </button>
                                                    </div>
                                                )) : (
                                                    <div className="col-span-2 py-8 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-2xl">
                                                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">No visual assets provided</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Video Creative */}
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                <Video size={16} className="text-red-400" /> Video Creative
                                            </h4>
                                            {resources.videos.length > 0 ? resources.videos.map((vid: string, i: number) => (
                                                <div key={i} className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
                                                            <Video className="text-red-500" size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-white">Campaign Trailer HD</p>
                                                            <p className="text-[10px] text-gray-500 font-mono">MP4 • 12.4 MB</p>
                                                        </div>
                                                    </div>
                                                    <button className="p-2 text-gray-500 hover:text-white transition-colors"><Download size={18} /></button>
                                                </div>
                                            )) : (
                                                <div className="py-8 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-2xl">
                                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">No video creatives provided</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Copy Templates */}
                                        <div className="md:col-span-2 space-y-4 pt-4 border-t border-white/5">
                                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                <FileText size={16} className="text-teal" /> Ad Copy Templates
                                            </h4>
                                            <div className="space-y-3">
                                                {resources.copy.length > 0 ? resources.copy.map((text: string, i: number) => (
                                                    <div key={i} className="group p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all relative">
                                                        <p className="text-xs text-gray-400 leading-relaxed pr-8 italic">"{text}"</p>
                                                        <button 
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(text);
                                                                setCopying(`copy-${i}`);
                                                                setTimeout(() => setCopying(null), 2000);
                                                            }}
                                                            className="absolute top-4 right-4 text-gray-600 hover:text-teal transition-colors"
                                                        >
                                                            {copying === `copy-${i}` ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                )) : (
                                                    <p className="text-center py-4 bg-white/[0.02] border border-dashed border-white/5 rounded-2xl text-[10px] text-gray-600 font-bold uppercase tracking-widest">No primary ad copy available</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ icon: Icon, label, value, unit, color }: any) {
    const colorMap: any = {
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5",
        teal: "text-teal bg-teal/10 border-teal/20 shadow-teal/5",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5"
    };

    return (
        <div className={cn("p-6 rounded-3xl border transition-all duration-500 hover:scale-[1.02] relative overflow-hidden group", colorMap[color])}>
            <div className="flex items-center justify-between mb-4">
                <Icon size={20} strokeWidth={2.5} className="opacity-80" />
                <span className="text-[8px] font-black tracking-[0.2em]">{unit}</span>
            </div>
            <p className="text-3xl font-black font-mono tracking-tighter">{value}</p>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60 mt-1">{label}</p>
            <div className="absolute bottom-0 right-0 w-12 h-12 bg-white/5 rounded-full blur-xl -mr-6 -mb-6 group-hover:scale-150 transition-transform duration-700" />
        </div>
    );
}
