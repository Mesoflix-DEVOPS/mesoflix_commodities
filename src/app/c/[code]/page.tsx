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
                c.embed_code,
                c.landing_page_url
            FROM campaign_assignments ca
            INNER JOIN campaigns c ON ca.campaign_id = c.id
            WHERE ca.unique_code = $1
            LIMIT 1
        `;
        const result = await pool.query(query, [code]);
        const campaign = result.rows[0];

        if (!campaign) {
            return notFound();
        }

        // 2. Attribution Locking: Set Secure Cookie
        const cookieStore = await cookies();
        cookieStore.set('campaign_assignment_id', campaign.assignment_id, {
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax'
        });

        // 3. Silent Click Analytics
        // We do this asynchronously to avoid slowing down the page load
        pool.query(
            "INSERT INTO campaign_analytics (assignment_id, event_type, created_at) VALUES ($1, 'CLICK', NOW())",
            [campaign.assignment_id]
        ).catch(err => console.error("[Campaign] Click recording failed:", err));

        // 4. Asset Rendering Protocol
        if (campaign.embed_code) {
            // Host the Capital.com Asset on Mesoflix URL
            return (
                <div className="fixed inset-0 w-full h-full bg-[#050B14]">
                    <div 
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: campaign.embed_code }}
                    />
                </div>
            );
        }

        // 5. Fallback: Standard Redirection
        redirect(campaign.landing_page_url || '/register');

    } catch (error) {
        console.error("[Campaign] Asset Landing Error:", error);
        redirect('/');
    }
}
