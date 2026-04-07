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

    const checkCache = async () => {
        const { data: account } = await supabase
            .from('capital_accounts')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!account) throw new Error('Institutional connection not found.');

        const now = Date.now();
        const lastUpdate = account.session_updated_at ? new Date(account.session_updated_at).getTime() : 0;
        const isSameMode = account.session_mode === (isDemo ? 'demo' : 'live');

        if (account.encrypted_session_tokens && isSameMode && (now - lastUpdate < SESSION_TTL_MS) && !forceRefresh) {
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
            } catch (e) {
                console.warn('[Session Cache] Decryption failed');
            }
        }
        return { lastUpdate };
    };

    try {
        // First Check
        let cached = await checkCache();
        if ('cst' in cached) return cached as SessionTokens;

        // --- CONCURRENCY HARDENING: Jitter & Re-check ---
        // If expired, wait for a random jitter (0-1000ms) and re-check.
        // This prevents 10 lambdas from all logging in at once.
        const jitter = Math.floor(Math.random() * 800);
        await new Promise(res => setTimeout(res, jitter));

        cached = await checkCache();
        if ('cst' in cached) return cached as SessionTokens;

        // Lock check: if it was updated < 15s ago, someone just did it.
        if (Date.now() - (cached as any).lastUpdate < REFRESH_LOCK_MS && !forceRefresh) {
             throw new Error('Capital.com Session Locked (Wait 15s)');
        }

        // 2. Perform fresh login
        const { data: account } = await supabase.from('capital_accounts').select('*').eq('user_id', userId).single();
        const apiKey = decrypt(account.encrypted_api_key);
        const apiPassword = decrypt(account.encrypted_api_password || '');
        
        let identifier = account.capital_account_id;
        if (!identifier) {
            const { data: user } = await supabase.from('users').select('email').eq('id', userId).single();
            identifier = user?.email || '';
        }

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

        // 4. Update Distributed Cache (Supabase)
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

    } catch (e: any) {
        if (e.message.includes('429')) {
             console.error('[Session API] 429 Detected, backing off...');
             throw new Error('Capital.com Rate Limited (429). Please wait 30s.');
        }
        console.error('[Frontend Session API] Fatal:', e.message);
        throw e;
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


