import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { capitalAccounts, systemSettings } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { createSession, getAccounts } from '@/lib/capital';
import { verifyAccessToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Verify JWT directly in Node runtime (more reliable than Edge middleware)
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const tokenPayload = await verifyAccessToken(accessToken);
        if (!tokenPayload) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const userId = tokenPayload.userId;

        let credentials;

        // 1. Try to get User Specific Account
        const [userAccount] = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId)).limit(1);

        if (userAccount) {
            try {
                const decrypted = decrypt(userAccount.encrypted_api_key);
                credentials = JSON.parse(decrypted);
            } catch (e) {
                console.error("Failed to decrypt user credentials", e);
            }
        }

        // 2. Fallback to System Master Credentials
        if (!credentials) {
            const [systemCreds] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'capital_master_credentials')).limit(1);

            if (systemCreds) {
                try {
                    const decrypted = decrypt(systemCreds.value);
                    credentials = JSON.parse(decrypted);
                } catch (e) {
                    console.error("Failed to decrypt master credentials", e);
                }
            }
        }

        if (!credentials) {
            return NextResponse.json({ message: 'No Capital.com account connected.' }, { status: 404 });
        }

        // Stored credentials format: { cst, xSecurityToken, apiKey }
        const { cst, xSecurityToken, apiKey } = credentials;

        if (!cst || !xSecurityToken) {
            return NextResponse.json({ message: 'Session tokens missing. Please log in again.' }, { status: 400 });
        }

        // Use stored session tokens directly
        try {
            const accountsData = await getAccounts(cst, xSecurityToken);
            return NextResponse.json(accountsData);
        } catch (err: any) {
            console.error("Fetch Accounts Failed:", err);
            // If session expired, tell client to re-authenticate
            return NextResponse.json({ message: `Session expired. Please log in again.` }, { status: 401 });
        }

    } catch (error: any) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
