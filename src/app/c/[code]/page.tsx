import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CampaignAssetLanding({ params }: { params: { code: string } }) {
    const { code } = await params;

    try {
        // 1. Institutional Lookup: Retrieve Campaign Identity & Assets
        const query = `
            SELECT 
                ca.id as assignment_id,
                c.name,
                c.description,
                c.embed_code,
                c.landing_page_url
            FROM campaign_assignments ca
            INNER JOIN campaigns c ON ca.campaign_id = c.id
            WHERE ca.unique_code = $1 OR ca.custom_alias = $1
            LIMIT 1
        `;
        const result = await pool.query(query, [code]);
        const campaign = result.rows[0];

        if (!campaign) {
            return notFound();
        }

        // 2. Attribution Locking (Non-Blocking)
        try {
            const cookieStore = await cookies();
            cookieStore.set('campaign_assignment_id', campaign.assignment_id, {
                maxAge: 30 * 24 * 60 * 60,
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'lax'
            });
        } catch (e) {
            console.warn("[Campaign] Cookie Attribution Blocked:", e);
        }

        // 3. Analytics Tracking (Silent/Async)
        pool.query(
            "INSERT INTO campaign_analytics (assignment_id, event_type, created_at) VALUES ($1, 'CLICK', NOW())",
            [campaign.assignment_id]
        ).catch(err => console.error("[Campaign] Tracking Failure:", err));

        // 4. Elite Asset Rendering Protocol
        return (
            <div className="min-h-screen bg-[#050B14] text-white selection:bg-teal selection:text-dark-blue font-sans overflow-x-hidden">
                {/* Background Atmosphere */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal/5 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
                </div>

                {/* Main Content Hub */}
                <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 md:p-12 lg:p-24 animate-in fade-in duration-1000">
                    <div className="w-full max-w-6xl">
                        {/* Header Branding */}
                        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-teal/10 rounded-xl border border-teal/20 flex items-center justify-center">
                                        <div className="w-5 h-5 bg-teal rounded-full animate-ping opacity-20" />
                                        <div className="absolute w-2 h-2 bg-teal rounded-full shadow-[0_0_10px_#00FFC8]" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-teal/80">Institutional Access Protocol</span>
                                </div>
                                <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">{campaign.name}</h1>
                            </div>
                            <div className="hidden md:block text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Secure Link Attribution</p>
                                <p className="text-sm font-mono text-white/40">{code.toUpperCase()}</p>
                            </div>
                        </div>

                        {/* The Asset Frame */}
                        <div className="relative group">
                            {/* Decorative Frame */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-teal/20 to-blue-500/20 rounded-[3rem] blur opacity-30 group-hover:opacity-50 transition duration-1000" />
                            
                            <div className="relative bg-[#0A1622]/80 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl min-h-[600px] flex flex-col">
                                {/* Top Bar */}
                                <div className="h-14 border-b border-white/5 px-8 flex items-center justify-between bg-white/[0.02]">
                                    <div className="flex gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500/20" />
                                        <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                                        <div className="w-2 h-2 rounded-full bg-green-500/20" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Asset Verification System : 100% SECURE</span>
                                </div>

                                {/* Content Rendering */}
                                <div className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden p-6 md:p-12">
                                    {campaign.embed_code ? (
                                        <div 
                                            className="w-full h-full transform hover:scale-[1.01] transition-transform duration-700 overflow-auto custom-scrollbar"
                                            dangerouslySetInnerHTML={{ __html: campaign.embed_code }}
                                        />
                                    ) : (
                                        <div className="text-center space-y-8 animate-pulse">
                                            <div className="w-24 h-24 bg-teal/10 rounded-full flex items-center justify-center mx-auto border border-teal/20 relative">
                                                <div className="absolute inset-0 bg-teal/20 rounded-full animate-ping opacity-20" />
                                                <div className="w-8 h-8 bg-teal rounded-full shadow-[0_0_20px_#00FFC8]" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Syncing Secure Asset</h3>
                                                <p className="text-gray-500 text-xs mt-3 font-mono tracking-widest">ESTABLISHING CONNECTION TO LANDING ZONE...</p>
                                            </div>
                                            
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                    <div className="h-full bg-teal animate-[loading_2s_ease-in-out_infinite]" />
                                                </div>
                                                <p className="text-[10px] text-teal/40 font-black uppercase tracking-[0.3em]">Institutional Redirect Active</p>
                                            </div>

                                            {/* Auto-redirect script for external links */}
                                            <script dangerouslySetInnerHTML={{ __html: `
                                                setTimeout(() => {
                                                    window.location.href = "${campaign.landing_page_url || '/register'}";
                                                }, 2000);
                                            `}} />
                                        </div>
                                    )}
                                </div>

                                {/* Footer Bar */}
                                <div className="p-8 border-t border-white/5 bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                                    <div className="max-w-xl">
                                        <p className="text-sm text-gray-400 leading-relaxed italic">
                                            "{campaign.description || 'This marketing cluster is secured by Mesoflix Institutional Infrastructure.'}"
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        <a 
                                            href="/register" 
                                            className="px-10 py-5 bg-teal text-dark-blue font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-xl shadow-teal/20 hover:scale-[1.05] hover:shadow-teal/40 transition-all flex items-center gap-3"
                                        >
                                            Initialize Terminal <span className="opacity-40">→</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Branding */}
                        <div className="mt-12 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-700">
                                Institutional Liquidity Managed by Capital.com • Infrastructure by Mesoflix
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error("[Campaign] Critical Recovery Protocol:", error);
        return (
            <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-10">
                <div className="text-center space-y-4">
                    <p className="text-teal font-black text-[10px] uppercase tracking-[0.5em]">Link Stability Restored</p>
                    <p className="text-white text-sm opacity-40">Syncing with capital.mesoflix.com...</p>
                    <a href="/" className="inline-block mt-8 text-[10px] font-black text-white/20 uppercase tracking-widest">Return to Base</a>
                </div>
            </div>
        );
    }
}
