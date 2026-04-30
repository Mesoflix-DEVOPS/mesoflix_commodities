"use client";

import { useEffect, useState } from "react";
import { 
    Megaphone,
    Loader2,
    Copy,
    Check,
    ExternalLink,
    Zap,
    X,
    Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

export default function StaffCampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    
    const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<any>(null);
    const [newAlias, setNewAlias] = useState('');
    const [isUpdatingAlias, setIsUpdatingAlias] = useState(false);

    const fetchData = async () => {
        setLoading(true);
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

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleUpdateAlias = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAssignment) return;
        setIsUpdatingAlias(true);
        try {
            const res = await authedFetch(`/api/staff/assignments/${editingAssignment.id}`, router, {
                method: "PATCH",
                body: JSON.stringify({ custom_alias: newAlias })
            });
            if (res?.ok) {
                setIsAliasModalOpen(false);
                setEditingAssignment(null);
                setNewAlias('');
                await fetchData();
            }
        } catch (err) {
            console.error("Vanity Link Update Failure:", err);
        } finally {
            setIsUpdatingAlias(false);
        }
    };

    const openAliasModal = (item: any) => {
        setEditingAssignment(item);
        setNewAlias(item.custom_alias || '');
        setIsAliasModalOpen(true);
    };

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

            {/* Modal: Edit Vanity Alias */}
            {isAliasModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAliasModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-[#0A1622] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Shorten Link</h3>
                                <p className="text-gray-500 text-sm mt-1">Generate your institutional vanity alias.</p>
                            </div>
                            <button onClick={() => setIsAliasModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X /></button>
                        </div>

                        <form onSubmit={handleUpdateAlias} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Custom Vanity Alias</label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-6 text-gray-500 font-mono text-xs">/c/</span>
                                    <input 
                                        required
                                        value={newAlias}
                                        onChange={(e) => setNewAlias(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        placeholder="gold-surge"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-teal/50 transition-all font-mono text-sm"
                                    />
                                </div>
                                <p className="text-[9px] text-gray-600 px-4">Only letters, numbers, and dashes allowed.</p>
                            </div>
                            <button 
                                disabled={isUpdatingAlias}
                                className="w-full py-5 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl"
                            >
                                {isUpdatingAlias ? <Loader2 className="animate-spin mx-auto" /> : "Deploy Vanity Alias"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {campaigns.map((item) => {
                    const displayPath = item.custom_alias ? `/c/${item.custom_alias}` : item.short_url;
                    return (
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
                                    <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between gap-4 group/link">
                                        <code className="text-[10px] font-black text-teal uppercase tracking-widest truncate">
                                            {displayPath}
                                        </code>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => openAliasModal(item)}
                                                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
                                                title="Shorten / Custom Alias"
                                            >
                                                <Target size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleCopy(displayPath, item.id)}
                                                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-teal"
                                            >
                                                {copiedId === item.id ? <Check size={16} className="text-teal" /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleCopy(displayPath, item.id)}
                                        className="w-full py-4 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-xl shadow-teal/20"
                                    >
                                        <Zap size={16} /> Deploy Referral Link
                                    </button>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-teal/5 blur-3xl -mr-16 -mt-16 group-hover:bg-teal/10 transition-all" />
                        </div>
                    );
                })}
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
