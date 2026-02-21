import { db } from '@/lib/db';
import { engineSettings } from '@/lib/db/schema';
import { verifyAccessToken } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const accessToken = (await cookieStore).get('access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = await verifyAccessToken(accessToken);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.userId;

        const settings = await db.select().from(engineSettings).where(eq(engineSettings.user_id, userId));

        return NextResponse.json(settings);

    } catch (error: any) {
        console.error('Engines GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const cookieStore = cookies();
        const accessToken = (await cookieStore).get('access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = await verifyAccessToken(accessToken);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.userId;
        const body = await request.json();
        const { engine_id, is_active, risk_level, parameters } = body;

        if (!engine_id) {
            return NextResponse.json({ error: 'Missing engine_id' }, { status: 400 });
        }

        // Upsert logic
        const [existing] = await db.select().from(engineSettings).where(
            and(
                eq(engineSettings.user_id, userId),
                eq(engineSettings.engine_id, engine_id)
            )
        ).limit(1);

        if (existing) {
            await db.update(engineSettings)
                .set({
                    is_active: is_active ?? existing.is_active,
                    risk_level: risk_level ?? existing.risk_level,
                    parameters: parameters ? JSON.stringify(parameters) : existing.parameters,
                    updated_at: new Date()
                })
                .where(eq(engineSettings.id, existing.id));
        } else {
            await db.insert(engineSettings).values({
                user_id: userId,
                engine_id,
                is_active: is_active ?? false,
                risk_level: risk_level ?? 'moderate',
                parameters: parameters ? JSON.stringify(parameters) : null
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Engines POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
