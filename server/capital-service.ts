import { db } from './db';
import { capitalAccounts, users } from './schema';
import { decrypt } from './crypto';
import { createSession, switchActiveAccount, getAccounts } from './capital';
import { eq } from 'drizzle-orm';

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';
const DEMO_API = 'https://demo-api-capital.backend-capital.com/api/v1';

export function getApiUrl(isDemo: boolean): string {
    return isDemo ? DEMO_API : LIVE_API;
}

export interface SessionTokens {
    cst: string;
    xSecurityToken: string;
    accountIsDemo: boolean;
    activeAccountId?: string | null;
    serverUrl: string;
}

export async function getValidSession(userId: string, forceDemo?: boolean): Promise<SessionTokens | null> {
    try {
        const [account] = await db.select()
            .from(capitalAccounts)
            .where(eq(capitalAccounts.user_id, userId))
            .limit(1);

        if (!account) return null;

        const isDemo = forceDemo !== undefined ? forceDemo : (account.account_type === 'demo');
        const apiKey = decrypt(account.encrypted_api_key);
        const apiPassword = decrypt(account.encrypted_api_password || '');
        const identifier = account.capital_account_id || '';

        // Standard institutional session creation
        const session = await createSession(identifier, apiPassword, apiKey, isDemo);

        // If a specific sub-account is selected, switch to it
        const targetAccountId = isDemo ? account.selected_demo_account_id : account.selected_real_account_id;
        
        if (targetAccountId && targetAccountId !== session.currentAccountId) {
            await switchActiveAccount(session.cst, session.xSecurityToken, targetAccountId, isDemo);
        }

        return {
            cst: session.cst,
            xSecurityToken: session.xSecurityToken,
            accountIsDemo: isDemo,
            activeAccountId: targetAccountId || session.currentAccountId,
            serverUrl: getApiUrl(isDemo)
        };
    } catch (error) {
        process.env.NODE_ENV !== 'production' && console.error('[Server Session Error]:', error);
        return null;
    }
}
