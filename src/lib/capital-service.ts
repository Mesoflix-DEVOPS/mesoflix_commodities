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
    const accounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));

    let credAccount = accounts.find(a => a.is_active) || accounts[0] || null;

    if (!credAccount) {
        const master = await db.select().from(capitalAccounts)
            .where(eq(capitalAccounts.label, 'MASTER')).limit(1);
        credAccount = master[0] || null;
    }

    if (!credAccount) {
        throw new Error('No Capital.com account configured. Please set up credentials in Settings.');
    }

    const cacheKey = memKey(credAccount.id, isDemo);

    // 2. Check in-memory cache
    if (!forceRefresh) {
        const cached = memCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return {
                ...cached.tokens,
                selectedAccountId: credAccount.selected_capital_account_id,
            };
        }
    }

    // 3. Fresh session creation
    const [owner] = await db.select().from(users).where(eq(users.id, credAccount.user_id)).limit(1);
    if (!owner) throw new Error('Account owner not found.');

    const apiKey = decrypt(credAccount.encrypted_api_key);
    const password = credAccount.encrypted_api_password ? decrypt(credAccount.encrypted_api_password) : null;
    if (!password) throw new Error('API password not set.');

    console.log(`[CapitalService] Creating ${isDemo ? 'DEMO' : 'LIVE'} session...`);

    try {
        const newSession = await createSession(owner.email, password, apiKey, isDemo);
        const tokens: SessionTokens = {
            cst: newSession.cst,
            xSecurityToken: newSession.xSecurityToken,
            accountIsDemo: isDemo,
            selectedAccountId: credAccount.selected_capital_account_id,
        };

        // Cache in memory
        memCache.set(cacheKey, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });

        // Non-crit persist (no mode-tagging to avoid logic loops)
        db.update(capitalAccounts).set({
            encrypted_session_tokens: encrypt(JSON.stringify(tokens)),
            session_updated_at: new Date(),
        }).where(eq(capitalAccounts.id, credAccount.id)).catch(() => { });

        return tokens;
    } catch (err: any) {
        if (isDemo) {
            console.warn(`[CapitalService] Demo failed, falling back to LIVE endpoint.`);
            const liveSession = await createSession(owner.email, password, apiKey, false);
            const tokens: SessionTokens = {
                cst: liveSession.cst,
                xSecurityToken: liveSession.xSecurityToken,
                accountIsDemo: false,
                selectedAccountId: credAccount.selected_capital_account_id,
            };
            memCache.set(cacheKey, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });
            return tokens;
        }
        throw err;
    }
}

/**
 * Evict cached session for a given mode (call when Capital.com returns 401).
 */
export async function clearCachedSession(userId: string, isDemo: boolean = false): Promise<void> {
    const userAccounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));

    if (userAccounts.length === 0) return;

    for (const acc of userAccounts) {
        // Clear memory cache
        const cacheKey = memKey(acc.id, isDemo);
        memCache.delete(cacheKey);

        // Clear DB cache if it matches the mode being evicted
        // We clear both if session_mode matches or if we're doing a global reset
        if (!acc.session_mode || acc.session_mode === (isDemo ? 'demo' : 'live')) {
            await db.update(capitalAccounts)
                .set({
                    encrypted_session_tokens: null,
                    session_updated_at: null,
                    session_mode: null // clear mode too to be certain
                })
                .where(eq(capitalAccounts.id, acc.id));
        }
    }
}
