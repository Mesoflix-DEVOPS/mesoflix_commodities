import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { capitalAccounts, systemSettings } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { createSession, getAccounts } from '@/lib/capital';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const userId = request.headers.get('x-user-id');

        // Note: We might want allow public access if it's a "general" dashboard, 
        // but for now we keep it authenticated via middleware
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

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
            return NextResponse.json({ message: 'No Capital.com account connected service-wide.' }, { status: 404 });
        }

        const { login, password, apiKey } = credentials;

        if (!login || !password || !apiKey) {
            return NextResponse.json({ message: 'Incomplete credentials configuration.' }, { status: 400 });
        }

        // 3. Create Session (Fresh session for every request - safest for now)
        let session;
        try {
            session = await createSession(login, password, apiKey);
        } catch (err: any) {
            console.error("Session Creation Failed:", err);
            return NextResponse.json({ message: 'Failed to authenticate with Capital.com' }, { status: 401 });
        }

        // 4. Fetch Data
        try {
            const accountsData = await getAccounts(session.cst, session.xSecurityToken);
            return NextResponse.json(accountsData);
        } catch (err: any) {
            console.error("Fetch Accounts Failed:", err);
            return NextResponse.json({ message: `Failed to fetch accounts: ${err.message}` }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
