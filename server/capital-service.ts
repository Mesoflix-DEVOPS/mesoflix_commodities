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
export const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const REFRESH_LOCK_MS = 15000; // 15 seconds lockout

export async function getValidSession(userId: string, forceDemo?: boolean, skipRefresh: boolean = false): Promise<SessionTokens | null> {
    const isDemo = forceDemo !== undefined ? forceDemo : false;
    const modeKey = isDemo ? 'demo' : 'live';

    const checkCache = async () => {
        const { data: account } = await supabase
            .from('capital_accounts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!account) return null;

        const now = Date.now();
        
        let sessionData: any = {};
        try {
            if (account.encrypted_session_tokens) {
                sessionData = JSON.parse(decrypt(account.encrypted_session_tokens));
            }
        } catch (e) { }

        const specificSession = sessionData[modeKey];
        const lastUpdate = specificSession?.updated_at ? new Date(specificSession.updated_at).getTime() : 0;

        // Check if specific mode session is still valid
        if (specificSession?.cst && (now - lastUpdate < SESSION_TTL_MS)) {
            return {
                cst: specificSession.cst,
                xSecurityToken: specificSession.xSecurityToken,
                accountIsDemo: isDemo,
                activeAccountId: specificSession.activeAccountId,
                serverUrl: getApiUrl(isDemo),
                lastUpdate
            };
        }
        return { lastUpdate, account, allSessions: sessionData };
    };

    try {
        let cached: any = await checkCache();
        if (!cached) return null;
        if ('cst' in cached) return cached as SessionTokens;

        if (skipRefresh) return null; 

        // Concurrency Hardening
        const jitter = Math.floor(Math.random() * 800);
        await new Promise(res => setTimeout(res, jitter));

        cached = await checkCache();
        if (!cached) return null;
        if ('cst' in cached) return cached as SessionTokens;

        if (Date.now() - cached.lastUpdate < REFRESH_LOCK_MS) {
            return null; 
        }

        const account = cached.account;
        return await performLogin(account, isDemo, cached.allSessions);
    } catch (error: any) {
        if (error.message?.includes('429')) {
             console.error(`[Server 429] Rate limited for ${userId}`);
        }
        return null;
    }
}

async function performLogin(account: any, isDemo: boolean, existingSessions: any = {}): Promise<SessionTokens> {
    const apiKey = decrypt(account.encrypted_api_key);
    const apiPassword = decrypt(account.encrypted_api_password || '');
    
    let identifier = account.capital_account_id;
    if (!identifier || identifier === '') {
        const { data: userData } = await supabase.from('users').select('email').eq('id', account.user_id).single();
        identifier = userData?.email || '';
    }

    let session = await createSession(identifier, apiPassword, apiKey, isDemo);
    
    // SECONDARY HANDSHAKE: Catch potential thin session responses (Missing Accounts)
    if ((!session.accounts || session.accounts.length === 0) && session.cst) {
        try {
            console.log(`[Identity Guard] Initial session accounts missing. Attempting deep-fetch for ${identifier}...`);
            const accountsData = await getAccounts(session.cst, session.xSecurityToken, isDemo);
            if (accountsData && accountsData.accounts) {
                session.accounts = accountsData.accounts;
            }
        } catch (e: any) {
            console.warn(`[Identity Guard] Deep-fetch failed for ${identifier}:`, e.message);
        }
    }

    // SCALABLE MODE VERIFICATION (Trust Brokerage Preferred Flags)
    const allAccounts = session.accounts || [];
    
    // 1. First, check if the brokerage provides a 'preferred' account on this server
    const preferredAccount = allAccounts.find((a: any) => a.preferred === true);
    
    // 2. Identify active account candidates
    const activeAccount = preferredAccount || allAccounts[0];

    if (!activeAccount) {
        console.error(`[Identity Guard] Critical: No accounts found on ${isDemo ? 'DEMO' : 'LIVE'} server for ${identifier}.`);
        throw new Error("No usable accounts found on the brokerage server.");
    }
    
    console.log(`[Identity Guard] Handshake Verified on ${isDemo ? 'DEMO' : 'LIVE'} for ${identifier}. Active ID: ${activeAccount.accountId}`);
    
    // 3. Determine if the user has a manually selected account preference in DB
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

    // Update only the target mode in the JSON blob
    const modeKey = isDemo ? 'demo' : 'live';
    const updatedSessions = {
        ...existingSessions,
        [modeKey]: {
            cst: tokens.cst,
            xSecurityToken: tokens.xSecurityToken,
            activeAccountId: tokens.activeAccountId,
            updated_at: new Date().toISOString()
        }
    };

    const encryptedTokens = encrypt(JSON.stringify(updatedSessions));

    await supabase
        .from('capital_accounts')
        .update({
            encrypted_session_tokens: encryptedTokens,
            session_updated_at: new Date().toISOString(), // Main timestamp for legacy checks
            updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

    return tokens;
}

export async function refreshAllActiveSessions() {
    try {
        const { data: accounts, error } = await supabase
            .from('capital_accounts')
            .select('*')
            .eq('is_active', true);

        if (error || !accounts) return;

        for (const account of accounts) {
            let sessionData: any = {};
            try {
                if (account.encrypted_session_tokens) {
                    sessionData = JSON.parse(decrypt(account.encrypted_session_tokens));
                }
            } catch (e) { }

            const now = Date.now();
            const modes: ('demo' | 'live')[] = ['demo', 'live'];

            for (const mode of modes) {
                // RE-FETCH: Always get latest DB state before each mode refresh to prevent overwriting other mode's tokens
                const { data: freshAcc } = await supabase.from('capital_accounts').select('*').eq('id', account.id).single();
                if (!freshAcc) continue;

                let currentSyncData: any = {};
                try {
                    if (freshAcc.encrypted_session_tokens) {
                        currentSyncData = JSON.parse(decrypt(freshAcc.encrypted_session_tokens));
                    }
                } catch (e) { }

                const specificSession = currentSyncData[mode];
                const lastUpdate = specificSession?.updated_at ? new Date(specificSession.updated_at).getTime() : 0;
                
                // Refresh if older than 4.2 minutes
                const NEEDS_REFRESH = (now - lastUpdate > (4.2 * 60 * 1000));
                
                if (NEEDS_REFRESH) {
                    console.log(`[Master Dual-Heartbeat] Syncing ${mode.toUpperCase()} for User ${account.user_id}`);
                    await performLogin(freshAcc, mode === 'demo', currentSyncData);
                    // Critical delay to avoid brokerage burst rate limits
                    await new Promise(res => setTimeout(res, 3500));
                }
            }
        }
    } catch (err: any) {
        console.error('[Master Heartbeat] Failure:', err.message);
    }
}
