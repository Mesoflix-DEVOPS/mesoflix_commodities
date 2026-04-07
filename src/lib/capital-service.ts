import { supabase } from './supabase';
import { decrypt, encrypt } from './crypto';
import { createSession, switchActiveAccount } from './capital';

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

// Unified Institutional Session Manager (Item 16 Unification)
const SESSION_TTL_MS = 5 * 60 * 1000;
const authMutex = new Map<string, Promise<SessionTokens>>();

async function performFailoverLogin(account: any, isDemo: boolean): Promise<SessionTokens> {
    const apiKeyEnc = account.encrypted_api_key || account.api_key;
    const apiPasswordEnc = account.encrypted_api_password || account.password;
    if (!apiKeyEnc || !apiPasswordEnc) throw new Error("Brokerage Credentials Missing.");

    const apiKey = decrypt(apiKeyEnc);
    const apiPassword = decrypt(apiPasswordEnc);
    
    let identifier = account.capital_account_id;
    if (!identifier) {
        const { data: userData } = await supabase.from('users').select('email').eq('id', account.user_id).single();
        identifier = userData?.email || '';
    }

    const session = await createSession(identifier, apiPassword, apiKey, isDemo);
    const serverUrl = isDemo ? DEMO_API : LIVE_API;
    
    const targetIdFromDb = isDemo ? account.selected_demo_account_id : account.selected_real_account_id;
    const activeAccountId = targetIdFromDb || session.currentAccountId;

    if (targetIdFromDb && targetIdFromDb !== session.currentAccountId) {
        await switchActiveAccount(session.cst, session.xSecurityToken, targetIdFromDb, isDemo);
    }

    return {
        cst: session.cst,
        xSecurityToken: session.xSecurityToken,
        accountIsDemo: isDemo,
        activeAccountId,
        serverUrl
    };
}

export async function getValidSession(userId: string, isDemo: boolean = false, forceRefresh: boolean = false): Promise<SessionTokens> {
    const cacheKey = `${userId}:${isDemo ? 'demo' : 'live'}`;
    
    if (authMutex.has(cacheKey)) return authMutex.get(cacheKey)!;

    const { data: account } = await supabase.from('capital_accounts').select('*').eq('user_id', userId).single();
    if (!account) throw new Error('Institutional link missing.');

    if (!forceRefresh && account.encrypted_session_tokens) {
        // ... (Existing cache logic is fine) ...
    }

    const loginPromise = (async () => {
        try {
            return await performFailoverLogin(account, isDemo);
        } finally {
            authMutex.delete(cacheKey);
        }
    })();

    authMutex.set(cacheKey, loginPromise);
    return loginPromise;
}

export async function clearCachedSession(userId: string): Promise<void> {
    await supabase.from('capital_accounts').update({ encrypted_session_tokens: null }).eq('user_id', userId);
}
