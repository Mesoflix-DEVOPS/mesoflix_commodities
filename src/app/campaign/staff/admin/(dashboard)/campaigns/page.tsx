"use client";

import { useEffect, useState } from "react";
import { 
    Plus, 
    Megaphone,
    Loader2,
    X,
    Zap,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

interface CampaignResources {
    copy: string[];
    images: string[];
    videos: string[];
}

interface Campaign {
    id: string;
    name: string;
    description: string;
    landing_page_url: string;
    embed_code: string;
    resources: CampaignResources;
    is_active: boolean;
}

export default function AdminCampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [newCampaign, setNewCampaign] = useState({ 
        name: '', 
        description: '', 
        landing_page_url: '/register', 
        embed_code: '', 
        resources: { copy: [] as string[], images: [] as string[], videos: [] as string[] } 
    });
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await authedFetch("/api/admin/campaigns", router);
            if (res?.ok) {
                const data = await res.json();
                setCampaigns(data.campaigns);
            }
        } catch (err) {
            console.error("Failed to load campaign hub:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const res = await authedFetch("/api/admin/campaigns", router, {
                method: "POST",
                body: JSON.stringify(newCampaign)
            });
            if (res?.ok) {
                setIsCreateModalOpen(false);
                setNewCampaign({ name: '', description: '', landing_page_url: '/register', embed_code: '', resources: { copy: [], images: [], videos: [] } });
                await fetchData();
            }
        } catch (err) {
            console.error("Campaign Creation Failure:", err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCampaign) return;
        setIsUpdating(true);
        try {
            const res = await authedFetch("/api/admin/campaigns", router, {
                method: "PATCH",
                body: JSON.stringify(editingCampaign)
            });
            if (res?.ok) {
                setIsEditModalOpen(false);
                setEditingCampaign(null);
                await fetchData();
            }
        } catch (err) {
            console.error("Campaign Update Failure:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const openEditModal = (camp: any) => {
        let resources = { copy: [], images: [], videos: [] };
        try {
            if (camp.resources) {
                resources = typeof camp.resources === 'string' ? JSON.parse(camp.resources) : camp.resources;
            }
        } catch (e) {}
        setEditingCampaign({ ...camp, resources });
        setIsEditModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-teal" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Syncing Global Campaign Registry</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Campaign Hub</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Central Control for Institutional Deployments</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-8 py-4 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center gap-2 shadow-xl shadow-teal/20"
                >
                    <Plus size={16} /> Initialize New Protocol
                </button>
            </div>

            {/* Modal: Edit Campaign */}
            {isEditModalOpen && editingCampaign && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)} />
                    <div className="relative w-full max-w-xl bg-[#0A1622] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Reconfigure Protocol</h3>
                                <p className="text-gray-500 text-sm mt-1">Modify active deployment parameters.</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X /></button>
                        </div>

                        <form onSubmit={handleUpdateCampaign} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Campaign Name</label>
                                <input 
                                    required
                                    value={editingCampaign.name}
                                    onChange={(e) => setEditingCampaign({...editingCampaign, name: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Deployment Objective</label>
                                <textarea 
                                    required
                                    value={editingCampaign.description}
                                    onChange={(e) => setEditingCampaign({...editingCampaign, description: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none h-24 resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Institutional Embed Code</label>
                                <textarea 
                                    value={editingCampaign.embed_code || ''}
                                    onChange={(e) => setEditingCampaign({...editingCampaign, embed_code: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-mono text-[10px] h-24"
                                />
                            </div>

                            {/* Creative Assets Section */}
                            <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Creative Asset Matrix</h4>
                                
                                <div className="space-y-4">
                                    <AssetList 
                                        label="Marketing Copy" 
                                        items={editingCampaign?.resources?.copy || []} 
                                        onAdd={(val: string) => editingCampaign && setEditingCampaign({
                                            ...editingCampaign, 
                                            resources: { ...editingCampaign.resources, copy: [...(editingCampaign.resources?.copy || []), val] }
                                        })}
                                        onRemove={(idx: number) => editingCampaign && setEditingCampaign({
                                            ...editingCampaign, 
                                            resources: { ...editingCampaign.resources, copy: (editingCampaign.resources?.copy || []).filter((_: any, i: number) => i !== idx) }
                                        })}
                                    />
                                    <AssetList 
                                        label="Image URLs" 
                                        items={editingCampaign?.resources?.images || []} 
                                        onAdd={(val: string) => editingCampaign && setEditingCampaign({
                                            ...editingCampaign, 
                                            resources: { ...editingCampaign.resources, images: [...(editingCampaign.resources?.images || []), val] }
                                        })}
                                        onRemove={(idx: number) => editingCampaign && setEditingCampaign({
                                            ...editingCampaign, 
                                            resources: { ...editingCampaign.resources, images: (editingCampaign.resources?.images || []).filter((_: any, i: number) => i !== idx) }
                                        })}
                                    />
                                </div>
                            </div>

                            <button 
                                disabled={isUpdating}
                                className="w-full py-5 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl"
                            >
                                {isUpdating ? <Loader2 className="animate-spin" /> : <><Zap size={18} /> Update Protocol</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal: Create Campaign */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)} />
                    <div className="relative w-full max-w-xl bg-[#0A1622] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Initialize Protocol</h3>
                                <p className="text-gray-500 text-sm mt-1">Deploy a new advertising cluster.</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X /></button>
                        </div>

                        <form onSubmit={handleCreateCampaign} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Campaign Name</label>
                                <input 
                                    required
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                                    placeholder="e.g. Q2 Commodities Surge"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-teal/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Deployment Objective</label>
                                <textarea 
                                    required
                                    value={newCampaign.description}
                                    onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                                    placeholder="Describe the target audience and value proposition..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-teal/50 transition-all h-32 resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Institutional Embed Code (HTML)</label>
                                <textarea 
                                    value={newCampaign.embed_code}
                                    onChange={(e) => setNewCampaign({...newCampaign, embed_code: e.target.value})}
                                    placeholder="Paste Capital.com iframe or asset code here..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-teal/50 transition-all h-24 font-mono text-[10px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Deployment Destination (Fallback)</label>
                                <input 
                                    required
                                    value={newCampaign.landing_page_url}
                                    onChange={(e) => setNewCampaign({...newCampaign, landing_page_url: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-mono text-sm"
                                />
                            </div>

                            {/* Creative Assets Section */}
                            <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Creative Asset Matrix</h4>
                                
                                <div className="space-y-4">
                                    <AssetList 
                                        label="Marketing Copy" 
                                        items={newCampaign.resources.copy} 
                                        onAdd={(val: string) => setNewCampaign({
                                            ...newCampaign, 
                                            resources: { ...newCampaign.resources, copy: [...newCampaign.resources.copy, val] }
                                        })}
                                        onRemove={(idx: number) => setNewCampaign({
                                            ...newCampaign, 
                                            resources: { ...newCampaign.resources, copy: newCampaign.resources.copy.filter((_: any, i: number) => i !== idx) }
                                        })}
                                    />
                                    <AssetList 
                                        label="Image URLs" 
                                        items={newCampaign.resources.images} 
                                        onAdd={(val: string) => setNewCampaign({
                                            ...newCampaign, 
                                            resources: { ...newCampaign.resources, images: [...newCampaign.resources.images, val] }
                                        })}
                                        onRemove={(idx: number) => setNewCampaign({
                                            ...newCampaign, 
                                            resources: { ...newCampaign.resources, images: newCampaign.resources.images.filter((_: any, i: number) => i !== idx) }
                                        })}
                                    />
                                </div>
                            </div>

                            <button 
                                disabled={isCreating}
                                className="w-full py-5 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-[0.2em] text-xs hover:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-teal/20"
                            >
                                {isCreating ? <Loader2 className="animate-spin" /> : <><Zap size={18} /> Activate Deployment</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

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
                        <div 
                            onClick={() => router.push(`/campaign/staff/admin/campaigns/${camp.id}`)}
                            className="flex-grow cursor-pointer group/content"
                        >
                            <h3 className="text-xl font-black text-white mb-2 leading-tight group-hover/content:text-teal transition-colors">{camp.name}</h3>
                            <p className="text-gray-500 text-sm mb-8 line-clamp-3 leading-relaxed flex-grow">{camp.description}</p>
                            
                            <div className="mb-6 px-4 py-2 bg-white/5 border border-white/10 rounded-xl inline-flex items-center gap-2 opacity-0 group-hover/content:opacity-100 transition-all">
                                <span className="text-[9px] font-black uppercase tracking-widest text-teal">View Mission Control</span>
                            </div>
                        </div>
                        
                        <div className="space-y-4 pt-6 border-t border-white/5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-gray-600">Status</span>
                                <span className="text-white">Live Deployment</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => openEditModal(camp)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Configure
                                </button>
                                <button 
                                    onClick={() => router.push('/campaign/staff/admin/staff')}
                                    className="flex-1 py-3 bg-teal text-dark-blue rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Assign Staff
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface AssetListProps {
    label: string;
    items: string[];
    onAdd: (val: string) => void;
    onRemove: (idx: number) => void;
}

function AssetList({ label, items, onAdd, onRemove }: AssetListProps) {
    const [inputValue, setInputValue] = useState('');

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{label}</label>
                <span className="text-[9px] font-bold text-teal/40">{items?.length || 0} Assets</span>
            </div>
            <div className="space-y-2">
                {items?.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 group">
                        <div className="flex-1 px-4 py-2 bg-white/5 border border-white/5 rounded-lg text-[10px] text-gray-400 truncate">
                            {item}
                        </div>
                        <button 
                            type="button"
                            onClick={() => onRemove(idx)}
                            className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
                <div className="flex gap-2">
                    <input 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={`Add ${label.toLowerCase()}...`}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-[10px] text-white focus:outline-none focus:border-teal/30"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (inputValue.trim()) {
                                    onAdd(inputValue.trim());
                                    setInputValue('');
                                }
                            }
                        }}
                    />
                    <button 
                        type="button"
                        onClick={() => {
                            if (inputValue.trim()) {
                                onAdd(inputValue.trim());
                                setInputValue('');
                            }
                        }}
                        className="p-2 bg-teal/10 text-teal rounded-lg hover:bg-teal/20 transition-all"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
