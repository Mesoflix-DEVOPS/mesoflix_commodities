import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { capitalAccounts, auditLogs, notifications } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { eq, and } from 'drizzle-orm';
import { verifyAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { clearCachedSession } from '@/lib/capital-service';

// Helper to get authenticated user
async function getUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    return payload ? payload.userId as string : null;
}

// GET: List all saved tokens for the user (masking sensitive data)
export async function GET() {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const accounts = await db.select({
            id: capitalAccounts.id,
            label: capitalAccounts.label,
            is_active: capitalAccounts.is_active,
            account_type: capitalAccounts.account_type,
            created_at: capitalAccounts.created_at,
        }).from(capitalAccounts).where(eq(capitalAccounts.user_id, userId));

        return NextResponse.json({ accounts });
    } catch (error: any) {
        console.error('Capital GET Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Add a new token
export async function POST(request: Request) {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { label, login, password, apiKey } = await request.json();

        if (!label || !password || !apiKey) {
            return NextResponse.json({ message: 'Label, Password, and API Key are required' }, { status: 400 });
        }

        const credentials = JSON.stringify({ login: login || '', password, apiKey });
        const encryptedKey = encrypt(credentials);

        // If this is their first token, make it active by default
        const existing = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId));
        const isActive = existing.length === 0;

        await db.insert(capitalAccounts).values({
            user_id: userId,
            label,
            is_active: isActive,
            encrypted_api_key: encryptedKey,
            account_type: 'live',
        });

        // Insert Notification
        await db.insert(notifications).values({
            user_id: userId,
            title: 'New API Token Added',
            message: `The Capital.com token "${label}" was successfully added to your vault.`,
            type: 'success'
        });

        // Audit Log
        const reqHeaders = request.headers;
        await db.insert(auditLogs).values({
            user_id: userId,
            action: 'ADD_CAPITAL_TOKEN',
            ip_address: reqHeaders.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json({ message: 'Capital.com token saved successfully' });
    } catch (error: any) {
        console.error('Capital POST Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH: Connect or Disconnect a specific token
export async function PATCH(request: Request) {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { accountId, action } = await request.json(); // action: 'connect' | 'disconnect'

        if (!accountId || (action !== 'connect' && action !== 'disconnect')) {
            return NextResponse.json({ message: 'Invalid request parameters' }, { status: 400 });
        }

        const [targetAccount] = await db.select().from(capitalAccounts).where(
            and(eq(capitalAccounts.id, accountId), eq(capitalAccounts.user_id, userId))
        ).limit(1);

        if (!targetAccount) {
            return NextResponse.json({ message: 'Account not found' }, { status: 404 });
        }

        if (action === 'connect') {
            // Unset all others
            await db.update(capitalAccounts).set({ is_active: false }).where(eq(capitalAccounts.user_id, userId));
            // Set targeted
            await db.update(capitalAccounts).set({ is_active: true, updated_at: new Date() }).where(eq(capitalAccounts.id, accountId));

            // Force clear cached session so the next request uses fresh credentials
            await clearCachedSession(userId);

            // Re-auth system will naturally trigger via stream restarts on the frontend.
            await db.insert(notifications).values({
                user_id: userId,
                title: 'Trading Bridge Connected',
                message: `Your global trading stream is now utilizing the "${targetAccount.label}" token.`,
                type: 'info'
            });
        } else if (action === 'disconnect') {
            await db.update(capitalAccounts).set({ is_active: false, updated_at: new Date() }).where(eq(capitalAccounts.id, accountId));

            // Force clear cached session
            await clearCachedSession(userId);

            await db.insert(notifications).values({
                user_id: userId,
                title: 'Trading Bridge Disconnected',
                message: `The "${targetAccount.label}" token has been disconnected. The system will fall back to master credentials.`,
                type: 'warning'
            });
        }

        return NextResponse.json({ message: `Token ${action}ed successfully` });
    } catch (error: any) {
        console.error('Capital PATCH Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE: Completely remove a saved token
export async function DELETE(request: Request) {
    try {
        const userId = await getUser();
        if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('id');

        if (!accountId) return NextResponse.json({ message: 'ID required' }, { status: 400 });

        const [targetAccount] = await db.select().from(capitalAccounts).where(
            and(eq(capitalAccounts.id, accountId), eq(capitalAccounts.user_id, userId))
        ).limit(1);

        if (targetAccount) {
            await db.delete(capitalAccounts).where(eq(capitalAccounts.id, accountId));
            await db.insert(notifications).values({
                user_id: userId,
                title: 'API Token Deleted',
                message: `The API token "${targetAccount.label}" was permanently removed.`,
                type: 'warning'
            });
        }

        return NextResponse.json({ message: 'Token deleted' });
    } catch (error: any) {
        console.error('Capital DELETE Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
