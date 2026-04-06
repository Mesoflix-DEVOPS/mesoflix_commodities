import { createClient } from '@supabase/supabase-js';
import { decrypt, encrypt } from './crypto';
import { createSession, switchActiveAccount, getAccounts } from './capital';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Prefer Service Role if possible
export const supabase = createClient(supabaseUrl, supabaseKey);

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

const memCache = new Map<string, { tokens: SessionTokens; expiresAt: number }>();
const SESSION_TTL_MS = 8 * 60 * 1000;

export async function getValidSession(
    userId: string,
    forceDemo: boolean = false,
    forceRefresh: boolean = false
): Promise<SessionTokens> {
    const isDemo = forceDemo;
    const cacheKey = `${userId}-${isDemo ? 'demo' : 'live'}`;
    const cached = memCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now() && !forceRefresh) {
        return cached.tokens;
    }

    try {
        // 1. Fetch credentials via stable SDK
        const { data: account, error } = await supabase
            .from('capital_accounts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !account) throw new Error('Institutional connection not found.');

        const apiKey = decrypt(account.encrypted_api_key);
        const apiPassword = decrypt(account.encrypted_api_password || '');
        
        let identifier = account.capital_account_id;
        if (!identifier) {
            const { data: user } = await supabase.from('users').select('email').eq('id', userId).single();
            identifier = user?.email || '';
        }

        // 2. Clear stale state & Authenticate
        const session = await createSession(identifier, apiPassword, apiKey, isDemo);

        // 3. Match user preference with broker availability
        const targetAccountId = isDemo ? account.selected_demo_account_id : account.selected_real_account_id;
        
        if (targetAccountId && targetAccountId !== session.currentAccountId) {
            await switchActiveAccount(session.cst, session.xSecurityToken, targetAccountId, isDemo);
        }

        const tokens: SessionTokens = {
            cst: session.cst,
            xSecurityToken: session.xSecurityToken,
            accountIsDemo: isDemo,
            activeAccountId: targetAccountId || session.currentAccountId,
            serverUrl: getApiUrl(isDemo)
        };

        memCache.set(cacheKey, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });
        return tokens;

    } catch (e: any) {
        console.error('[Frontend Session API] Fatal:', e.message);
        throw e;
    }
}

export async function clearCachedSession(userId: string): Promise<void> {
    // Clear all entries for this user in the local memory cache
    for (const key of memCache.keys()) {
        if (key.startsWith(`${userId}-`)) {
            memCache.delete(key);
        }
    }
}


