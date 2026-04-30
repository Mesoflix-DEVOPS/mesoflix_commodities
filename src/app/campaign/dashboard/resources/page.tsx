"use client";

import { 
    FileText, 
    Download, 
    ExternalLink, 
    Image as ImageIcon, 
    Video, 
    Share2,
    ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const resources = [
    { title: "Commodities Master Deck", type: "PDF", size: "4.2 MB", icon: FileText, category: "Presentation" },
    { title: "Social Media Asset Pack", type: "ZIP", size: "128 MB", icon: ImageIcon, category: "Graphics" },
    { title: "Promotional Teaser (4K)", type: "MP4", size: "85 MB", icon: Video, category: "Video" },
    { title: "Distribution Guidelines", type: "DOCX", size: "1.1 MB", icon: ShieldCheck, category: "Policy" },
];

export default function MarketingResourcesPage() {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Marketing Hub</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Institutional Resources & Deployment Assets</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {resources.map((res, i) => (
                    <div key={i} className="bg-[#0E1B2A] rounded-[3rem] border border-white/5 p-8 shadow-2xl group hover:border-teal/30 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center text-teal border border-white/5 group-hover:scale-110 transition-all">
                                <res.icon size={32} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-teal uppercase tracking-widest mb-1">{res.category}</p>
                                <h3 className="text-xl font-black text-white tracking-tight">{res.title}</h3>
                                <p className="text-gray-500 text-xs font-mono mt-1">{res.type} • {res.size}</p>
                            </div>
                        </div>
                        <button className="p-4 bg-white/5 hover:bg-teal text-gray-500 hover:text-dark-blue rounded-2xl transition-all">
                            <Download size={24} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="bg-gradient-to-br from-teal/20 to-transparent border border-teal/20 rounded-[3rem] p-12 relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Need custom assets?</h2>
                    <p className="text-gray-400 text-lg leading-relaxed mb-8">
                        Our creative department is ready to support your unique distribution strategy. Request personalized banners, videos, or landing page tweaks.
                    </p>
                    <button className="px-10 py-5 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-widest text-xs hover:scale-105 transition-all flex items-center gap-3 shadow-2xl shadow-teal/30">
                        <Share2 size={20} /> Contact Creative Support
                    </button>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal/10 blur-[120px] rounded-full -mr-48 -mt-48" />
            </div>
        </div>
    );
}
