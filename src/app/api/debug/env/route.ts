import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const hasAccessToken = cookieStore.has('access_token');

        return NextResponse.json({
            runtime: 'Node.js',
            env: {
                JWT_SECRET_SET: !!process.env.JWT_SECRET,
                NODE_ENV: process.env.NODE_ENV,
                DATABASE_URL_SET: !!process.env.DATABASE_URL
            },
            cookies: {
                hasAccessToken
            },
            timestamp: new Date().toISOString()
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
