import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { capitalAccounts, auditLogs } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const userId = request.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { login, password, apiKey } = await request.json();

        if (!login || !password || !apiKey) {
            return NextResponse.json({ message: 'Login, Password, and API Key are required' }, { status: 400 });
        }

        // Store as JSON string in encrypted field
        const credentials = JSON.stringify({ login, password, apiKey });
        const encryptedKey = encrypt(credentials);

        // Check if exists
        const [existing] = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId)).limit(1);

        if (existing) {
            await db.update(capitalAccounts).set({
                encrypted_api_key: encryptedKey, // reusing this field to store full data blob
                account_type: 'live', // assuming live if key provided, or add toggle
                updated_at: new Date(),
            }).where(eq(capitalAccounts.id, existing.id));
        } else {
            await db.insert(capitalAccounts).values({
                user_id: userId,
                encrypted_api_key: encryptedKey,
                account_type: 'live',
            });
        }

        // Audit Log
        await db.insert(auditLogs).values({
            user_id: userId,
            action: 'UPDATE_CAPITAL_CREDENTIALS',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json({ message: 'Capital.com credentials saved successfully' });

    } catch (error: any) {
        console.error('Capital Connection Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
