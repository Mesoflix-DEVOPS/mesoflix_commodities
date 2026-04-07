import { supabase } from './supabase';
import { decrypt, encrypt } from './crypto';
import { createSession, switchActiveAccount, getAccounts } from './capital';

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

        if (specificSession?.cst && (now - lastUpdate < SESSION_TTL_MS)) {
            return {
                cst: specificSession.cst,
                xSecurityToken: specificSession.xSecurityToken,
                accountIsDemo: isDemo,
                activeAccountId: specificSession.activeAccountId,
                serverUrl: specificSession.serverUrl || getApiUrl(isDemo)
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
    const userId = account.user_id;
    const apiKeyEnc = account.encrypted_api_key || account.api_key;
    const apiPasswordEnc = account.encrypted_api_password || account.password;
    
    if (!apiKeyEnc || !apiPasswordEnc) {
        throw new Error("Brokerage Credentials Missing in DB Cluster.");
    }

    const apiKey = decrypt(apiKeyEnc);
    const apiPassword = decrypt(apiPasswordEnc);

    // Fetch Broker Identifier (Item 3 alignment)
    let identifier = account.capital_account_id;
    if (!identifier) {
        const { data: userData } = await supabase.from('users').select('email').eq('id', userId).single();
        identifier = userData?.email || '';
    }

    console.log(`[Handshake] Universal Discovery for ${identifier} (${isDemo ? 'DEMO' : 'REAL'})`);

    // --- DUAL-SERVER DISCOVERY ENGINE ---
    let demoSession: any = null;
    let liveSession: any = null;

    try {
        // [Discovery] Multi-Identifier Handshake
        demoSession = await createSession(identifier || '', apiPassword, apiKey, true).catch(async (err: any) => {
            if (err.message.includes('401')) {
                const { data: userData } = await supabase.from('users').select('email').eq('id', userId).single();
                const email = userData?.email;
                if (email && email !== identifier) {
                    console.log(`[Discovery] Identity Fallback for ${userId}: Trying email...`);
                    return await createSession(email, apiPassword, apiKey, true).catch(() => null);
                }
            }
            return null;
        });

        liveSession = await createSession(identifier || '', apiPassword, apiKey, false).catch(() => null);
    } catch (e) { }

    if (!demoSession && !liveSession) {
        throw new Error("Brokerage Identity Rejected across all servers.");
    }

    // Collect all unique accounts across the dual-server cluster
    const allAccounts: any[] = [];
    if (demoSession?.accounts) {
        demoSession.accounts.forEach((a: any) => allAccounts.push({ ...a, server: DEMO_API, session: demoSession }));
    }
    if (liveSession?.accounts) {
        liveSession.accounts.forEach((a: any) => allAccounts.push({ ...a, server: LIVE_API, session: liveSession }));
    }

    // --- UNIVERSAL MAPPING LOGIC ---
    let targetAccount: any = null;
    if (isDemo) {
        // Priority for Demo: Any account on the Demo server, otherwise a secondary account on the Real server
        targetAccount = allAccounts.find(a => a.server === DEMO_API) || 
                        allAccounts.find((a, idx) => a.server === LIVE_API && (a.accountType === 'DEMO' || idx > 0)) ||
                        allAccounts[0];
    } else {
        // Priority for Real: The first account on the Real server
        targetAccount = allAccounts.find(a => a.server === LIVE_API) || allAccounts[0];
    }

    if (!targetAccount) throw new Error("Account Isolation Failure in discovery cluster.");

    console.log(`[Handshake] Mapped: ${isDemo ? 'DEMO' : 'REAL'} -> ID ${targetAccount.accountId} on ${targetAccount.server}`);

    // If session ID differs from active, we switch
    if (targetAccount.accountId !== targetAccount.session.currentAccountId) {
        await switchActiveAccount(targetAccount.session.cst, targetAccount.session.xSecurityToken, targetAccount.accountId, targetAccount.server === DEMO_API);
    }

    // --- DUAL-ID PERSISTENCE (Item 17 Fix) ---
    // Extract first available IDs for both environments from the dual discovery
    const discoveredRealId = liveSession?.accounts?.find((a: any) => a.accountType === 'CFD' || !(a.accountName || '').toLowerCase().includes('demo'))?.accountId;
    const discoveredDemoId = demoSession?.accounts?.find((a: any) => a.accountType === 'SPREADBET' || (a.accountName || '').toLowerCase().includes('demo'))?.accountId;

    const tokens: SessionTokens = {
        cst: targetAccount.session.cst,
        xSecurityToken: targetAccount.session.xSecurityToken,
        accountIsDemo: isDemo,
        activeAccountId: targetAccount.accountId,
        serverUrl: targetAccount.server
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
            selected_real_account_id: discoveredRealId || account.selected_real_account_id,
            selected_demo_account_id: discoveredDemoId || account.selected_demo_account_id,
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
            .select('*');

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
                const NEEDS_REFRESH = (now - lastUpdate > (4 * 60 * 1000));
                
                if (NEEDS_REFRESH) {
                    console.log(`[Master Heartbeat] Syncing ${mode.toUpperCase()} for User ${account.user_id}`);
                    await performLogin(freshAcc, mode === 'demo', currentSyncData).catch(() => null);
                    await new Promise(res => setTimeout(res, 2000));
                }
            }
        }
    } catch (err: any) {
        console.error('[Master Heartbeat] Failure:', err.message);
    }
}
