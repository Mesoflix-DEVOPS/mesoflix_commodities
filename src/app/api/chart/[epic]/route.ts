import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getValidSession } from '@/lib/capital-service';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ epic: string }> }
) {
    try {
        const { epic } = await params;
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'real';
        const resolution = searchParams.get('resolution') || 'HOUR';
        const max = searchParams.get('max') || '50';
        const RENDER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

        // Proxy request to Render Centralized Chart Engine
        const res = await fetch(`${RENDER_URL}/api/chart/${epic}?mode=${mode}&resolution=${resolution}&max=${max}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return NextResponse.json({ 
                epic, 
                chartData: [], 
                snapshot: null, 
                warning: errData.error || 'Institutional Link Lag' 
            });
        }

        const data = await res.json();
        
        // Final formatting check for UI safety
        return NextResponse.json({
            epic: data.epic,
            chartData: (data.chartData || []).map((p: any) => ({
                ...p,
                time: p.time ? new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
            })),
            snapshot: data.snapshot
        });

    } catch (err: any) {
        console.error('[Chart Proxy] Failed:', err.message);
        return NextResponse.json({ epic: '', chartData: [], snapshot: null, warning: 'Institutional Bridge Timeout' });
    }
}
