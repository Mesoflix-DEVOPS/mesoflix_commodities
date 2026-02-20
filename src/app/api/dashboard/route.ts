import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { capitalAccounts } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { getAccounts } from '@/lib/capital';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const userId = request.headers.get('x-user-id');

        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get Encrypted Access Info
        const [account] = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId)).limit(1);

        if (!account) {
            return NextResponse.json({ message: 'Capital.com account not connected' }, { status: 404 });
        }

        // 2. Decrypt Session Tokens (Assumes we stored CST:XST in encrypted_api_key for now)
        // If we switch to full automated login later, we'd store login/pass here and re-login.
        const decrypted = decrypt(account.encrypted_api_key);
        const [cst, xSecurityToken] = decrypted.split(':');

        if (!cst || !xSecurityToken) {
            return NextResponse.json({ message: 'Invalid stored credentials' }, { status: 400 });
        }

        // 3. Fetch Data
        try {
            const accountsData = await getAccounts(cst, xSecurityToken);
            return NextResponse.json(accountsData);
        } catch (err: any) {
            if (err.message === "Session Expired") {
                return NextResponse.json({ message: 'Capital.com Session Expired' }, { status: 401 });
            }
            throw err;
        }

    } catch (error: any) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
