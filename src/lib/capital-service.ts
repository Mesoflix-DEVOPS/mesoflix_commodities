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

export async function getValidSession(
    userId: string,
    forceDemo: boolean = false,
    forceRefresh: boolean = false
): Promise<SessionTokens> {
    const isDemo = forceDemo;

    // 1. Fetch credentials and cached session (Master-Sync only)
    const { data: account } = await supabase
        .from('capital_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!account) throw new Error('Institutional connection not found.');

    const now = Date.now();
    const lastUpdate = account.session_updated_at ? new Date(account.session_updated_at).getTime() : 0;
    const isSameMode = account.session_mode === (isDemo ? 'demo' : 'live');

    // FRONTEND: READ-ONLY OBSERVER MODE
    // We only use the session if it's within the TTL. 
    // We NEVER perform logins here to avoid 429 thundering herd.
    if (account.encrypted_session_tokens && isSameMode && (now - lastUpdate < SESSION_TTL_MS) && !forceRefresh) {
        try {
            const decrypted = JSON.parse(decrypt(account.encrypted_session_tokens));
            return {
                cst: decrypted.cst,
                xSecurityToken: decrypted.xSecurityToken,
                accountIsDemo: isDemo,
                activeAccountId: decrypted.activeAccountId,
                serverUrl: getApiUrl(isDemo)
            };
        } catch (e) {
            console.warn('[Frontend Session] Cache decryption failed');
        }
    }

    // If we land here, the Master (Render) needs to refresh it.
    throw new Error('Capital.com Syncing: Waiting for Master Authority...');
}

export async function clearCachedSession(userId: string): Promise<void> {
    await supabase
        .from('capital_accounts')
        .update({
            encrypted_session_tokens: null,
            session_updated_at: null,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
}


