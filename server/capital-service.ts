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
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_LOCK_MS = 15000; // 15 seconds lockout

export async function getValidSession(userId: string, forceDemo?: boolean): Promise<SessionTokens | null> {
    const isDemo = forceDemo !== undefined ? forceDemo : false;

    const checkCache = async () => {
        const { data: account } = await supabase
            .from('capital_accounts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!account) return null;

        const now = Date.now();
        const lastUpdate = account.session_updated_at ? new Date(account.session_updated_at).getTime() : 0;
        const isSameMode = account.session_mode === (isDemo ? 'demo' : 'live');

        if (account.encrypted_session_tokens && isSameMode && (now - lastUpdate < SESSION_TTL_MS)) {
            try {
                const decrypted = JSON.parse(decrypt(account.encrypted_session_tokens));
                return {
                    cst: decrypted.cst,
                    xSecurityToken: decrypted.xSecurityToken,
                    accountIsDemo: isDemo,
                    activeAccountId: decrypted.activeAccountId,
                    serverUrl: getApiUrl(isDemo),
                    lastUpdate
                };
            } catch (e) { }
        }
        return { lastUpdate, account };
    };

    try {
        let cached: any = await checkCache();
        if (!cached) return null;
        if ('cst' in cached) return cached as SessionTokens;

        // --- CONCURRENCY HARDENING ---
        const jitter = Math.floor(Math.random() * 800);
        await new Promise(res => setTimeout(res, jitter));

        cached = await checkCache();
        if (!cached) return null;
        if ('cst' in cached) return cached as SessionTokens;

        if (Date.now() - cached.lastUpdate < REFRESH_LOCK_MS) {
            console.warn(`[Server] Session locked for user ${userId}, waiting for propagation...`);
            return null; // Let the next poll handle it
        }

        const account = cached.account;
        const apiKey = decrypt(account.encrypted_api_key);
        const apiPassword = decrypt(account.encrypted_api_password || '');
        
        let identifier = account.capital_account_id;
        if (!identifier || identifier === '') {
            const { data: userData } = await supabase
                .from('users')
                .select('email')
                .eq('id', userId)
                .single();
            identifier = userData?.email || '';
        }

        const session = await createSession(identifier, apiPassword, apiKey, isDemo);

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

        // Update Distributed Cache
        const encryptedTokens = encrypt(JSON.stringify({
            cst: tokens.cst,
            xSecurityToken: tokens.xSecurityToken,
            activeAccountId: tokens.activeAccountId
        }));

        await supabase
            .from('capital_accounts')
            .update({
                encrypted_session_tokens: encryptedTokens,
                session_mode: isDemo ? 'demo' : 'live',
                session_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', account.id);

        return tokens;
    } catch (error: any) {
        if (error.message?.includes('429')) {
             console.error(`[Server 429] Rate limited for ${userId}`);
        }
        process.env.NODE_ENV !== 'production' && console.error('[Server Session Error]:', error);
        return null;
    }
}
