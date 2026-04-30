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
    Upload,
    ImageIcon,
    Video,
    FileText,
    Link as LinkIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

interface Campaign {
    id: string;
    name: string;
    description: string;
    landing_page_url: string;
    embed_code: string | null;
    resources: string | null;
    is_active: boolean;
    created_at: string;
}

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

interface Assignment {
    id: string;
    campaign_id: string;
    staff_id: string;
    unique_code: string;
    short_url: string;
    status: string;
    staff_email: string;
    staff_name: string;
    campaign_name: string;
}

export default function AdminCampaignDashboard() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'assignments'>('overview');
    
    // Create Campaign Form
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        description: '',
        landing_page_url: '/register',
        embed_code: '',
        resources: { images: [], videos: [], copy: [] }
    });

    // Assign Staff Form
    const [newAssignment, setNewAssignment] = useState({
        campaign_id: '',
        staff_id: ''
    });

    const router = useRouter();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [campRes, asgnRes, userRes] = await Promise.all([
                authedFetch("/api/admin/campaigns", router),
                authedFetch("/api/admin/assignments", router),
                authedFetch("/api/support/agent/users", router)
            ]);

            if (campRes?.ok) {
                const data = await campRes.json();
                setCampaigns(data.campaigns);
            }
            if (asgnRes?.ok) {
                const data = await asgnRes.json();
                setAssignments(data.assignments);
            }
            if (userRes?.ok) {
                const data = await userRes.json();
                setUsers(data.users);
            }
        } catch (err) {
            console.error("Failed to load admin data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleCreateCampaign = async () => {
        try {
            const res = await authedFetch("/api/admin/campaigns", router, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCampaign)
            });
            if (res?.ok) {
                setShowCreateModal(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateAssignment = async () => {
        try {
            const res = await authedFetch("/api/admin/assignments", router, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newAssignment)
            });
            if (res?.ok) {
                setShowAssignModal(false);
                fetchData();
            }
        } catch (err) {
            alert("Already assigned or error occurred.");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-teal" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing Campaign Command Centre</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-teal font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Award size={12} /> Institutional Marketing Terminal
                    </h2>
                    <h1 className="text-4xl font-black text-white tracking-tight">Campaign Command</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage global advertising campaigns, resources, and partner distributions.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-teal hover:bg-[#00b39b] text-[#0A1622] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-teal/10 transition-all"
                    >
                        <Plus size={16} /> New Campaign
                    </button>
                    <button 
                        onClick={() => setShowAssignModal(true)}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
                    >
                        <Users size={16} /> Assign Staff
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AdminStatCard label="Global Campaigns" value={campaigns.length} icon={Megaphone} color="blue" />
                <AdminStatCard label="Active Partners" value={users.length} icon={Users} color="teal" />
                <AdminStatCard label="Assignments" value={assignments.length} icon={LinkIcon} color="purple" />
                <AdminStatCard label="System Trust" value="100%" icon={Zap} color="green" />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-[#0A1622] p-1 rounded-2xl border border-white/5 w-fit">
                {['overview', 'campaigns', 'assignments'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === tab ? "bg-white/5 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Live Partner Distribution */}
                    <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-xl">
                        <h3 className="text-xl font-bold text-white tracking-tight">Partner Distribution</h3>
                        <div className="space-y-4">
                            {assignments.slice(0, 5).map((asgn) => (
                                <div key={asgn.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center border border-teal/20 text-teal font-black text-xs">
                                            {asgn.staff_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{asgn.staff_name}</p>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{asgn.campaign_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-teal font-mono bg-teal/5 px-2 py-0.5 rounded border border-teal/10">{asgn.unique_code}</span>
                                    </div>
                                </div>
                            ))}
                            {assignments.length === 0 && <p className="text-center py-10 text-gray-600 text-xs font-black uppercase">No active assignments</p>}
                        </div>
                    </div>

                    {/* System Performance Feed */}
                    <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-xl">
                        <h3 className="text-xl font-bold text-white tracking-tight">Active Campaign Feed</h3>
                        <div className="space-y-4">
                            {campaigns.slice(0, 5).map((camp) => (
                                <div key={camp.id} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                                        <Megaphone className="text-blue-500" size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <p className="text-sm font-bold text-white">{camp.name}</p>
                                            <span className="text-[9px] text-gray-500 font-mono">{new Date(camp.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{camp.description}</p>
                                    </div>
                                </div>
                            ))}
                            {campaigns.length === 0 && <p className="text-center py-10 text-gray-600 text-xs font-black uppercase">No global campaigns</p>}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'campaigns' && (
                <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-xl">
                    <table className="w-full text-left">
                        <thead className="bg-[#0A1622] border-b border-white/5">
                            <tr className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                <th className="px-8 py-5">Campaign Name</th>
                                <th className="px-8 py-5">Landing Path</th>
                                <th className="px-8 py-5">Partners</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {campaigns.map((camp) => (
                                <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                                <Megaphone size={14} />
                                            </div>
                                            <span className="font-bold text-white">{camp.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-gray-400 font-mono text-xs">{camp.landing_page_url}</td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-full border border-teal/20">
                                            {assignments.filter(a => a.campaign_id === camp.id).length} Active
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 text-gray-600 hover:text-white transition-colors"><Settings size={16} /></button>
                                        <button className="p-2 text-gray-600 hover:text-red-500 transition-colors ml-2"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'assignments' && (
                <div className="bg-[#0E1B2A] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-xl">
                    <table className="w-full text-left">
                        <thead className="bg-[#0A1622] border-b border-white/5">
                            <tr className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                <th className="px-8 py-5">Partner Email</th>
                                <th className="px-8 py-5">Assigned Campaign</th>
                                <th className="px-8 py-5">Reference Code</th>
                                <th className="px-8 py-5 text-right">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {assignments.map((asgn) => (
                                <tr key={asgn.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center text-teal font-black text-[10px]">
                                                {asgn.staff_email?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-xs">{asgn.staff_name || 'Anonymous'}</p>
                                                <p className="text-[10px] text-gray-500">{asgn.staff_email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-gray-400 font-bold text-xs uppercase tracking-tight">{asgn.campaign_name}</td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-mono font-bold text-teal">{asgn.unique_code}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Revoke</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Campaign Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-[#0A1622] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h2 className="text-2xl font-black text-white">Initialize Campaign</h2>
                                <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Configure global advertising target</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Campaign Title</label>
                                <input 
                                    type="text" 
                                    value={newCampaign.name}
                                    onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                                    placeholder="e.g. Q4 Institutional Market Blitz" 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 text-white placeholder:text-gray-600 focus:border-teal/50 transition-all outline-none" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Strategic Description</label>
                                <textarea 
                                    value={newCampaign.description}
                                    onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                                    placeholder="Outline the goals and messaging for this campaign..." 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 text-white placeholder:text-gray-600 focus:border-teal/50 transition-all outline-none min-h-[100px]" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Landing Destination (Redirect URL)</label>
                                <input 
                                    type="text" 
                                    value={newCampaign.landing_page_url}
                                    onChange={e => setNewCampaign({...newCampaign, landing_page_url: e.target.value})}
                                    placeholder="e.g. /register or https://external-link.com" 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 text-white placeholder:text-gray-600 focus:border-teal/50 transition-all outline-none" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Embed Content (HTML / Script)</label>
                                <textarea 
                                    value={newCampaign.embed_code}
                                    onChange={e => setNewCampaign({...newCampaign, embed_code: e.target.value})}
                                    placeholder="Paste HTML or tracking codes here. This will be rendered on the landing page." 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 text-white placeholder:text-gray-600 focus:border-teal/50 transition-all outline-none min-h-[120px] font-mono text-xs" 
                                />
                            </div>

                            {/* Resource Input Section */}
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Strategic Asset Distribution</p>
                                
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-1">Visual Asset URLs (Comma separated)</label>
                                        <input 
                                            type="text" 
                                            placeholder="https://image1.jpg, https://image2.jpg"
                                            onChange={(e) => setNewCampaign({
                                                ...newCampaign, 
                                                resources: { ...newCampaign.resources, images: e.target.value.split(',').map(s => s.trim()).filter(s => s) }
                                            })}
                                            className="w-full bg-[#162B40]/50 border border-white/5 rounded-xl p-3 text-sm text-white outline-none focus:border-teal/30 transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-1">Video Creative URLs (Comma separated)</label>
                                        <input 
                                            type="text" 
                                            placeholder="https://video1.mp4"
                                            onChange={(e) => setNewCampaign({
                                                ...newCampaign, 
                                                resources: { ...newCampaign.resources, videos: e.target.value.split(',').map(s => s.trim()).filter(s => s) }
                                            })}
                                            className="w-full bg-[#162B40]/50 border border-white/5 rounded-xl p-3 text-sm text-white outline-none focus:border-teal/30 transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest px-1">Ad Copy Templates (One per line)</label>
                                        <textarea 
                                            placeholder="Get started with Mesoflix today!&#10;Join the commodity revolution..."
                                            onChange={(e) => setNewCampaign({
                                                ...newCampaign, 
                                                resources: { ...newCampaign.resources, copy: e.target.value.split('\n').map(s => s.trim()).filter(s => s) }
                                            })}
                                            className="w-full bg-[#162B40]/50 border border-white/5 rounded-xl p-3 text-sm text-white outline-none focus:border-teal/30 transition-all min-h-[100px]" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-white/5 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                            <button onClick={handleCreateCampaign} className="flex-1 py-4 bg-teal text-[#0A1622] rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-teal/10 hover:bg-[#00b39b] transition-all">Deploy Campaign</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowAssignModal(false)}>
                    <div className="bg-[#0A1622] border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h2 className="text-2xl font-black text-white">Partner Linkage</h2>
                                <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Connect staff to advertising pools</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="p-2 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Select Targeting Campaign</label>
                                <select 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 text-white focus:border-teal/50 outline-none appearance-none"
                                    value={newAssignment.campaign_id}
                                    onChange={e => setNewAssignment({...newAssignment, campaign_id: e.target.value})}
                                >
                                    <option value="">Choose a campaign...</option>
                                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Institutional Partner</label>
                                <select 
                                    className="w-full bg-[#162B40] border border-white/5 rounded-2xl p-4 text-white focus:border-teal/50 outline-none appearance-none"
                                    value={newAssignment.staff_id}
                                    onChange={e => setNewAssignment({...newAssignment, staff_id: e.target.value})}
                                >
                                    <option value="">Select staff member...</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>)}
                                </select>
                            </div>
                            
                            <div className="p-6 bg-blue-500/5 rounded-[2rem] border border-blue-500/10">
                                <p className="text-xs text-blue-400 font-bold leading-relaxed">
                                    System policy: Each partner-campaign pair generates a unique tracking code. This linkage enables real-time P&L and reach analytics.
                                </p>
                            </div>
                        </div>
                        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                            <button onClick={() => setShowAssignModal(false)} className="flex-1 py-4 bg-white/5 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                            <button onClick={handleCreateAssignment} className="flex-1 py-4 bg-teal text-[#0A1622] rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-teal/10 hover:bg-[#00b39b] transition-all">Establish Link</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminStatCard({ label, value, icon: Icon, color }: any) {
    const colorMap: any = {
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        teal: "text-teal bg-teal/10 border-teal/20",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        green: "text-green-500 bg-green-500/10 border-green-500/20"
    };

    return (
        <div className={cn("p-6 rounded-[2rem] border relative overflow-hidden group transition-all duration-500 hover:scale-[1.03]", colorMap[color])}>
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/5 rounded-lg"><Icon size={18} /></div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
            </div>
            <p className="text-2xl font-black text-white font-mono">{value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-1">{label}</p>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-white/10 transition-all" />
        </div>
    );
}
