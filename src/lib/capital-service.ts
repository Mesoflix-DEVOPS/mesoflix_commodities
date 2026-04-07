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

// --- INTELLIGENT FAILOVER (Vercel Edge Handshake) ---
async function performFailoverLogin(account: any, isDemo: boolean): Promise<SessionTokens> {
    console.warn(`[Failover] Master Authority Lag. Performing high-priority handshake for ${account.user_id}...`);
    const apiKey = decrypt(account.encrypted_api_key);
    const apiPassword = decrypt(account.encrypted_api_password || '');
    
    // Fallback back to user email if ID is missing
    let identifier = account.capital_account_id;
    if (!identifier) {
        const { data: userData } = await supabase.from('users').select('email').eq('id', account.user_id).single();
        identifier = userData?.email || '';
    }

    const session = await createSession(identifier, apiPassword, apiKey, isDemo);
    
    // Determine target account
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
        serverUrl: getApiUrl(isDemo)
    };
}

export async function getValidSession(
    userId: string,
    forceDemo: boolean = false,
    forceRefresh: boolean = false
): Promise<SessionTokens> {
    const isDemo = forceDemo;
    const modeKey = isDemo ? 'demo' : 'live';

    const { data: account } = await supabase
        .from('capital_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!account) throw new Error('Institutional connection not found.');

    const now = Date.now();
    
    // Attempt to use cached session from Master (Render)
    if (account.encrypted_session_tokens && !forceRefresh) {
        try {
            const allSessions = JSON.parse(decrypt(account.encrypted_session_tokens));
            const specificSession = allSessions[modeKey];
            
            if (specificSession) {
                const lastUpdate = new Date(specificSession.updated_at).getTime();
                if (now - lastUpdate < SESSION_TTL_MS) {
                    return {
                        cst: specificSession.cst,
                        xSecurityToken: specificSession.xSecurityToken,
                        accountIsDemo: isDemo,
                        activeAccountId: specificSession.activeAccountId,
                        serverUrl: getApiUrl(isDemo)
                    };
                }
            }
        } catch (e) {
            console.warn('[Session Failover] Cache parse failed');
        }
    }

    // 🚀 EXECUTE FAILOVER: Instead of waiting for Master, we perform a high-priority direct link
    try {
        return await performFailoverLogin(account, isDemo);
    } catch (err: any) {
        console.error(`[Failover Critical] Brokerage link failed for ${userId}:`, err.message);
        throw new Error(`Brokerage Connection Pending: ${err.message}`);
    }
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
