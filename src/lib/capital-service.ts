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
    const modeKey = isDemo ? 'demo' : 'live';

    // 1. Fetch credentials and cached session (Master-Sync only)
    const { data: account } = await supabase
        .from('capital_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!account) throw new Error('Institutional connection not found.');

    const now = Date.now();
    
    // FRONTEND: READ-ONLY OBSERVER MODE
    // We parse the dual-mode JSON blob
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
            console.warn('[Frontend Session] Dual-cache parse failed');
        }
    }

    // If we land here, the Master (Render) needs to refresh the specific mode.
    throw new Error(`Capital.com ${isDemo ? 'Demo' : 'Live'} Syncing: Waiting for Master Authority...`);
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


