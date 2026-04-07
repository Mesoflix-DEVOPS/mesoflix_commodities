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
            // Determine if this 'Demo' session actually points to the Live API (Standalone Setup)
            const useLiveApiForDemo = specificSession.serverUrl?.includes('api-capital'); 
            
            return {
                cst: specificSession.cst,
                xSecurityToken: specificSession.xSecurityToken,
                accountIsDemo: isDemo,
                activeAccountId: specificSession.activeAccountId,
                serverUrl: specificSession.serverUrl || getApiUrl(isDemo),
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

        // Concurrency Guard
        const jitter = Math.floor(Math.random() * 500);
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
        console.error(`[Session Manager] Error for ${userId}:`, error.message);
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

    // --- SCALABLE HANDSHAKE ENGINE ---
    // We attempt connection to both servers to correctly map accounts for any user.
    let targetServerUrl = getApiUrl(isDemo);
    let session: any = null;

    try {
        session = await createSession(identifier, apiPassword, apiKey, isDemo);
        
        // Handshake verification
        if ((!session.accounts || session.accounts.length === 0) && session.cst) {
            const accData = await getAccounts(session.cst, session.xSecurityToken, isDemo);
            if (accData?.accounts) session.accounts = accData.accounts;
        }
    } catch (err: any) {
        console.warn(`[Handshake] Direct ${isDemo ? 'DEMO' : 'LIVE'} failed, checking standalone fallback...`);
    }

    // STANDALONE FALLBACK: If Demo server fails, but user needs Demo, check the Real server for multiple accounts.
    if (isDemo && (!session || !session.accounts || session.accounts.length === 0)) {
        try {
            console.log(`[Handshake] Attempting Standalone Demo Discovery on Real server for ${identifier}...`);
            const realSession = await createSession(identifier, apiPassword, apiKey, false);
            const accData = await getAccounts(realSession.cst, realSession.xSecurityToken, false);
            const allRealAccs = accData?.accounts || [];
            
            if (allRealAccs.length >= 2) {
                console.log(`[Handshake] Found ${allRealAccs.length} accounts on Real server. Isolating for Demo Standalone.`);
                session = realSession;
                session.accounts = allRealAccs;
                targetServerUrl = LIVE_API; // Force Live API even for Demo mode
            }
        } catch (e: any) {
            console.error(`[Handshake] Critical: All servers unreachable for ${identifier}`);
            throw new Error("Brokerage Connection Refused. Please check credentials.");
        }
    }

    if (!session || !session.accounts || session.accounts.length === 0) {
        throw new Error("No usable accounts found on the brokerage server.");
    }

    const allAccounts = session.accounts;
    
    // Identification Logic:
    // 1. If we are on the DEMO server, any account is a demo.
    // 2. If we are on the LIVE server in Demo mode, we pick the one with the HIGHER balance or the 'CFD' label if others are 'Spread Betting'.
    // 3. For any user, we prefer the 'account.selected_x_account_id' if set.

    let activeAccount = allAccounts.find((a: any) => 
        (isDemo ? a.accountId === account.selected_demo_account_id : a.accountId === account.selected_real_account_id)
    );

    if (!activeAccount) {
        if (isDemo && targetServerUrl === LIVE_API) {
            // Heuristic for Standalone Demo (Pick the high balance one)
            activeAccount = allAccounts.sort((a: any, b: any) => (b.balance?.balance || 0) - (a.balance?.balance || 0))[0];
        } else {
            activeAccount = allAccounts.find((a: any) => a.preferred === true) || allAccounts[0];
        }
    }

    if (!activeAccount) throw new Error("Account resolution failure.");

    if (activeAccount.accountId !== session.currentAccountId) {
        await switchActiveAccount(session.cst, session.xSecurityToken, activeAccount.accountId, targetServerUrl === DEMO_API);
    }

    const tokens: SessionTokens = {
        cst: session.cst,
        xSecurityToken: session.xSecurityToken,
        accountIsDemo: isDemo,
        activeAccountId: activeAccount.accountId,
        serverUrl: targetServerUrl
    };

    const modeKey = isDemo ? 'demo' : 'live';
    const updatedSessions = {
        ...existingSessions,
        [modeKey]: {
            ...tokens,
            updated_at: new Date().toISOString()
        }
    };

    await supabase
        .from('capital_accounts')
        .update({
            encrypted_session_tokens: encrypt(JSON.stringify(updatedSessions)),
            selected_real_account_id: !isDemo && !account.selected_real_account_id ? activeAccount.accountId : account.selected_real_account_id,
            selected_demo_account_id: isDemo && !account.selected_demo_account_id ? activeAccount.accountId : account.selected_demo_account_id,
            session_updated_at: new Date().toISOString(),
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
