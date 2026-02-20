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

        const { apiKey, accountId, type } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ message: 'API Key is required' }, { status: 400 });
        }

        const encryptedKey = encrypt(apiKey);

        // Check if exists
        const [existing] = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId)).limit(1);

        if (existing) {
            await db.update(capitalAccounts).set({
                encrypted_api_key: encryptedKey,
                capital_account_id: accountId,
                account_type: type || 'demo',
                updated_at: new Date(),
            }).where(eq(capitalAccounts.id, existing.id));
        } else {
            await db.insert(capitalAccounts).values({
                user_id: userId,
                encrypted_api_key: encryptedKey,
                capital_account_id: accountId,
                account_type: type || 'demo',
            });
        }

        // Audit Log
        await db.insert(auditLogs).values({
            user_id: userId,
            action: 'UPDATE_CAPITAL_KEY',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json({ message: 'Capital.com credentials saved successfully' });

    } catch (error: any) {
        console.error('Capital Connection Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
