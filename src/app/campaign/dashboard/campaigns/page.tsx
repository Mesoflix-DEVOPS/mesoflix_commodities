"use client";

import { useEffect, useState } from "react";
import { 
    Megaphone,
    Loader2,
    Copy,
    Check,
    ExternalLink,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

export default function StaffCampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await authedFetch("/api/staff/campaigns", router);
                if (res?.ok) {
                    const data = await res.json();
                    setCampaigns(data.campaigns);
                }
            } catch (err) {
                console.error("Failed to load staff campaigns:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [router]);

    const handleCopy = (url: string, id: string) => {
        const fullUrl = `${window.location.origin}${url}`;
        navigator.clipboard.writeText(fullUrl);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-teal" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Synchronizing Active Deployments</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">My Active Campaigns</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Active Referral Nodes & Distribution Hub</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {campaigns.map((item) => (
                    <div key={item.id} className="bg-[#0E1B2A] rounded-[3rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden group hover:border-teal/30 transition-all flex flex-col h-full">
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-8">
                                <div className="w-14 h-14 bg-teal/10 rounded-2xl flex items-center justify-center text-teal border border-teal/20">
                                    <Megaphone size={28} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Performance</p>
                                    <p className="text-xl font-black text-white font-mono">{item.leads} <span className="text-gray-600 text-xs uppercase ml-1">Leads</span></p>
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{item.campaign_name}</h3>
                            <p className="text-gray-500 text-sm mb-8 leading-relaxed line-clamp-3 flex-grow">
                                {item.campaign_description || "No specific deployment brief provided for this marketing cluster."}
                            </p>

                            <div className="space-y-4 mt-auto">
                                <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                                    <code className="text-[10px] font-black text-teal uppercase tracking-widest truncate">
                                        {item.short_url}
                                    </code>
                                    <button 
                                        onClick={() => handleCopy(item.short_url, item.id)}
                                        className="shrink-0 p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-teal"
                                    >
                                        {copiedId === item.id ? <Check size={16} className="text-teal" /> : <Copy size={16} />}
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={() => handleCopy(item.short_url, item.id)}
                                    className="w-full py-4 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-xl shadow-teal/20"
                                >
                                    <Zap size={16} /> Deploy Referral Link
                                </button>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal/5 blur-3xl -mr-16 -mt-16 group-hover:bg-teal/10 transition-all" />
                    </div>
                ))}
                {campaigns.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-700 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/5">
                        <Megaphone size={48} className="opacity-10 mb-4" />
                        <p className="font-black text-xs uppercase tracking-widest opacity-40">No active assignments found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
