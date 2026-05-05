"use client";

import { useEffect, useState } from "react";
import { 
    Users,
    Loader2,
    TrendingUp,
    Plus,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

export default function AdminStaffPage() {
    const router = useRouter();
    const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [newAssignment, setNewAssignment] = useState({ campaign_id: '', staff_id: '' });
    const [isAssigning, setIsAssigning] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [analyticsRes, usersRes, campRes] = await Promise.all([
                authedFetch("/api/admin/analytics/global", router),
                authedFetch("/api/admin/users", router),
                authedFetch("/api/admin/campaigns", router)
            ]);

            if (analyticsRes?.ok) {
                const data = await analyticsRes.json();
                setStaffPerformance(data.staffPerformance);
            }
            if (usersRes?.ok) {
                const data = await usersRes.json();
                setAllUsers(data.users);
            }
            if (campRes?.ok) {
                const data = await campRes.json();
                setCampaigns(data.campaigns);
            }
        } catch (err) {
            console.error("Failed to load staff matrix:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const handleAssignStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAssignment.campaign_id || !newAssignment.staff_id) return;
        setIsAssigning(true);
        try {
            const res = await authedFetch("/api/admin/assignments", router, {
                method: "POST",
                body: JSON.stringify(newAssignment)
            });
            if (res?.ok) {
                setIsAssignModalOpen(false);
                setNewAssignment({ campaign_id: '', staff_id: '' });
                await fetchData();
            }
        } catch (err) {
            console.error("Staff Assignment Failure:", err);
        } finally {
            setIsAssigning(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-teal" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing Partner Roster Registry</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Partner Management</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Institutional Oversight of Staff Distribution</p>
                </div>
                <button 
                    onClick={() => setIsAssignModalOpen(true)}
                    className="px-8 py-4 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all flex items-center gap-2 shadow-xl shadow-teal/20"
                >
                    <Plus size={16} /> Link New Partner
                </button>
            </div>

            {/* Modal: Assign Staff */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAssignModalOpen(false)} />
                    <div className="relative w-full max-w-xl bg-[#0A1622] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Assign Partner</h3>
                                <p className="text-gray-500 text-sm mt-1">Link a staff member to an active cluster.</p>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X /></button>
                        </div>

                        <form onSubmit={handleAssignStaff} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Select Campaign</label>
                                <select 
                                    required
                                    value={newAssignment.campaign_id}
                                    onChange={(e) => setNewAssignment({...newAssignment, campaign_id: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-teal/50 transition-all appearance-none"
                                >
                                    <option value="" className="bg-[#0A1622]">Choose active cluster...</option>
                                    {campaigns.map(c => (
                                        <option key={c.id} value={c.id} className="bg-[#0A1622]">{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal uppercase tracking-widest ml-4">Target Partner (Staff)</label>
                                <select 
                                    required
                                    value={newAssignment.staff_id}
                                    onChange={(e) => setNewAssignment({...newAssignment, staff_id: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-teal/50 transition-all appearance-none"
                                >
                                    <option value="" className="bg-[#0A1622]">Select staff member...</option>
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id} className="bg-[#0A1622]">{u.full_name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                disabled={isAssigning}
                                className="w-full py-5 bg-white text-dark-blue font-black rounded-2xl uppercase tracking-[0.2em] text-xs hover:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl"
                            >
                                {isAssigning ? <Loader2 className="animate-spin" /> : <><Users size={18} /> Link Partner Identity</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

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
                                <th className="px-10 py-6">Conversions</th>
                                <th className="px-10 py-6 text-right">Ratio (L/C)</th>
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
                                    <td className="px-10 py-6 font-mono text-purple-400 text-lg font-black">{perf.conversions || 0}</td>
                                    <td className="px-10 py-6 text-right font-mono text-xl font-black text-white">
                                        {((perf.conversions / (perf.leads || 1)) * 100).toFixed(1)}%
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
