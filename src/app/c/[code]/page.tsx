import { redirect } from 'next/navigation';

export default async function CampaignShortLink({ params }: { params: { code: string } }) {
    const { code } = await params;
    // Redirect to the unified tracking API
    redirect(`/api/campaign/track?c=${code}`);
}
