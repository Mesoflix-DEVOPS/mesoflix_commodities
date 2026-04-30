"use client";

import { useEffect, useState } from "react";
import { 
    TrendingUp,
    Loader2,
    Filter,
} from "lucide-react";
import { authedFetch } from "@/lib/fetch-utils";
import { useRouter } from "next/navigation";

export default function AdminAnalyticsPage() {
    const router = useRouter();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await authedFetch("/api/admin/assignments", router);
            if (res?.ok) {
                const data = await res.json();
                setAssignments(data.assignments);
            }
        } catch (err) {
            console.error("Failed to load analytics matrix:", err);
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
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Accessing Secure Analytics Matrix</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Live Analytics Matrix</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Granular Tracking & Attribution Oversight</p>
                </div>
                <button onClick={fetchData} className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all">
                    <TrendingUp size={18} /> Refresh Data
                </button>
            </div>

            <div className="bg-[#0E1B2A] rounded-[3.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-10 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Active Referral Matrix</h3>
                        <p className="text-gray-500 text-sm mt-1">Real-time performance tracking for all active referral nodes.</p>
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
        </div>
    );
}
