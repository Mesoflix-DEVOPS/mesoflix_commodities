import { db } from './db';
import { capitalAccounts, users } from './db/schema';
import { encrypt, decrypt } from './crypto';
import { createSession } from './capital';
import { eq, and } from 'drizzle-orm';

export interface SessionTokens {
    cst: string;
    xSecurityToken: string;
    accountIsDemo?: boolean;
    selectedAccountId?: string | null;
}

// ---------------------------------------------------------------------------
// In-memory session cache keyed by `{accountId}:{mode}`.
// Survives within a warm serverless instance (Netlify keeps functions warm
// for several minutes, enough to avoid hammering Capital.com for every poll).
// ---------------------------------------------------------------------------
interface CachedEntry {
    tokens: SessionTokens;
    expiresAt: number;
}
const memCache = new Map<string, CachedEntry>();
const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function memKey(accountId: string, isDemo: boolean) {
    return `${accountId}:${isDemo ? 'demo' : 'live'}`;
}

// ---------------------------------------------------------------------------
// Core: get (or create) a valid Capital.com session for the requested mode.
//
// IMPORTANT: `isDemo` controls TWO things:
//   1. Which Capital.com endpoint to call  (demo vs live server)
//   2. Which cached session to reuse       (demo vs live cache slot)
//
// The DB account is used for CREDENTIALS only (email, api_key, password).
// Whether we hit demo-api-capital.com or api-capital.com is determined
// entirely by the requested `isDemo` flag — NOT by account_type in the DB.
// ---------------------------------------------------------------------------
export async function getValidSession(
    userId: string,
    isDemo: boolean = false,
    forceRefresh: boolean = false,
): Promise<SessionTokens> {
    // 1. Find the best account for credentials
    //    Priority: User's explicitly ACTIVE account -> Any user account (fallback) -> System master account
    const activeAccount = await db.select().from(capitalAccounts)
        .where(and(eq(capitalAccounts.user_id, userId), eq(capitalAccounts.is_active, true)))
        .limit(1);

    let credAccount = activeAccount[0] || null;

    if (!credAccount) {
        const userAccounts = await db.select().from(capitalAccounts)
            .where(eq(capitalAccounts.user_id, userId))
            .limit(1);
        credAccount = userAccounts[0] || null;
    }

    if (!credAccount) {
        const master = await db.select().from(capitalAccounts)
            .where(eq(capitalAccounts.label, 'MASTER')).limit(1);
        credAccount = master[0] || null;
    }

    if (!credAccount) {
        const all = await db.select().from(capitalAccounts).limit(1);
        credAccount = all[0] || null;
    }

    if (!credAccount) {
        throw new Error('No Capital.com account configured. Please set up master credentials.');
    }

    const cacheKey = memKey(credAccount.id, isDemo);

    // 2. Check in-memory cache (fast path — survives within warm instance)
    if (!forceRefresh) {
        const cached = memCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            const tokens: SessionTokens = {
                ...cached.tokens,
                accountIsDemo: isDemo,
            };
            // Refresh selectedAccountId from DB even on memCache hit to ensure it's fresh
            const activeRow = await db.select({ selectedId: capitalAccounts.selected_capital_account_id })
                .from(capitalAccounts)
                .where(and(eq(capitalAccounts.user_id, userId), eq(capitalAccounts.is_active, true)))
                .limit(1);
            tokens.selectedAccountId = activeRow[0]?.selectedId;

            return tokens;
        }
    }

    // 3. Check DB-persisted session cache for THIS mode
    //    We store demo and live tokens in separate rows if possible,
    //    otherwise we always create a fresh session and only memCache it.
    if (!forceRefresh && credAccount.encrypted_session_tokens && credAccount.session_updated_at) {
        // Only reuse DB cache for the SAME mode it was created for
        const dbCacheMode = credAccount.session_mode;
        const wantedMode = isDemo ? 'demo' : 'live';
        if (dbCacheMode === wantedMode) {
            const lastUpdate = new Date(credAccount.session_updated_at);
            if (Date.now() - lastUpdate.getTime() < SESSION_TTL_MS) {
                try {
                    const tokens: SessionTokens = {
                        ...JSON.parse(decrypt(credAccount.encrypted_session_tokens)),
                        accountIsDemo: isDemo,
                        selectedAccountId: credAccount.selected_capital_account_id,
                    };
                    memCache.set(cacheKey, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });
                    return tokens;
                } catch {
                    // Corrupted cache — fall through to fresh session
                }
            }
        }
    }

    // 4. Create a fresh session on the correct endpoint
    const [owner] = await db.select().from(users)
        .where(eq(users.id, credAccount.user_id)).limit(1);
    if (!owner) throw new Error('Account owner not found in users table.');

    const apiKey = decrypt(credAccount.encrypted_api_key);
    const password = credAccount.encrypted_api_password
        ? decrypt(credAccount.encrypted_api_password)
        : null;
    if (!password) throw new Error('API password not set for this account.');

    console.log(`[CapitalService] Creating ${isDemo ? 'DEMO' : 'LIVE'} session for account ${credAccount.id.slice(0, 8)}...`);

    let newSession;
    try {
        // isDemo determines demo-api-capital.com vs api-capital.com
        newSession = await createSession(owner.email, password, apiKey, isDemo);
    } catch (demoErr: any) {
        if (isDemo) {
            // Some accounts don't have a separate demo environment.
            // Fall back to the live endpoint and mark it so consumers know.
            console.warn(`[CapitalService] Demo endpoint failed (${demoErr.message}), falling back to LIVE endpoint.`);
            newSession = await createSession(owner.email, password, apiKey, false);
            // Return live tokens but annotated as fallback
            const tokens: SessionTokens = {
                cst: newSession.cst,
                xSecurityToken: newSession.xSecurityToken,
                accountIsDemo: false, // indicate we're using live endpoint
                selectedAccountId: credAccount.selected_capital_account_id,
            };
            memCache.set(cacheKey, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });
            return tokens;
        }
        throw new Error(`Capital.com session error: ${demoErr.message}`);
    }

    const tokens: SessionTokens = {
        cst: newSession.cst,
        xSecurityToken: newSession.xSecurityToken,
        accountIsDemo: isDemo,
        selectedAccountId: credAccount.selected_capital_account_id,
    };

    // 5. Persist to DB (tagged with mode so we know which endpoint it's for)
    try {
        await db.update(capitalAccounts)
            .set({
                encrypted_session_tokens: encrypt(JSON.stringify(tokens)),
                session_updated_at: new Date(),
                session_mode: isDemo ? 'demo' : 'live',
            })
            .where(eq(capitalAccounts.id, credAccount.id));
    } catch {
        // Non-critical — memCache still works
    }

    // 6. Store in memory cache
    memCache.set(cacheKey, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });

    return tokens;
}

/**
 * Evict cached session for a given mode (call when Capital.com returns 401).
 */
export async function clearCachedSession(userId: string, isDemo: boolean = false): Promise<void> {
    const userAccounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));
    const credAccount = userAccounts[0];
    if (!credAccount) return;

    const cacheKey = memKey(credAccount.id, isDemo);
    memCache.delete(cacheKey);

    // Only clear DB cache if it matches the mode being evicted
    const dbCacheMode = (credAccount as any).session_mode;
    const wantedMode = isDemo ? 'demo' : 'live';
    if (!dbCacheMode || dbCacheMode === wantedMode) {
        await db.update(capitalAccounts)
            .set({ encrypted_session_tokens: null, session_updated_at: null })
            .where(eq(capitalAccounts.id, credAccount.id));
    }
}
