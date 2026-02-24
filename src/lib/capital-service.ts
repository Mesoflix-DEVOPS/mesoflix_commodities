import { db } from './db';
import { capitalAccounts, users } from './db/schema';
import { encrypt, decrypt } from './crypto';
import { createSession } from './capital';
import { eq } from 'drizzle-orm';

export interface SessionTokens {
    cst: string;
    xSecurityToken: string;
    accountIsDemo: boolean;
    activeAccountId?: string | null;
}

interface CachedEntry {
    tokens: SessionTokens;
    expiresAt: number;
}

// Two separate in-memory caches — one per server (live/demo)
// Key format: `${credAccountId}-live` or `${credAccountId}-demo`
const memCache = new Map<string, CachedEntry>();

// Capital.com sessions expire after 10 minutes of inactivity.
// We cache for 8 minutes to give a safe 2-minute buffer.
const SESSION_TTL_MS = 8 * 60 * 1000;

function cacheKey(credAccountId: string, isDemo: boolean): string {
    return `${credAccountId}-${isDemo ? 'demo' : 'live'}`;
}

/**
 * Try to restore a session from the database.
 * Stored sessions are shared across serverless function invocations.
 */
async function loadSessionFromDB(
    credAccountId: string,
    isDemo: boolean
): Promise<SessionTokens | null> {
    try {
        const [row] = await db
            .select({
                encrypted_session_tokens: capitalAccounts.encrypted_session_tokens,
                session_updated_at: capitalAccounts.session_updated_at,
                session_mode: capitalAccounts.session_mode,
                selected_capital_account_id: capitalAccounts.selected_capital_account_id,
            })
            .from(capitalAccounts)
            .where(eq(capitalAccounts.id, credAccountId))
            .limit(1);

        if (!row?.encrypted_session_tokens || !row?.session_updated_at) return null;

        // Only restore if the stored mode matches what we need
        const storedMode = row.session_mode === 'demo';
        if (storedMode !== isDemo) return null;

        const ageMs = Date.now() - row.session_updated_at.getTime();
        if (ageMs > SESSION_TTL_MS) {
            console.log(`[Service] DB session too old (${Math.round(ageMs / 1000)}s). Creating fresh.`);
            return null;
        }

        const parsed = JSON.parse(decrypt(row.encrypted_session_tokens));
        if (!parsed?.cst || !parsed?.xSecurityToken) return null;

        console.log(`[Service] Restored ${isDemo ? 'DEMO' : 'LIVE'} session from DB (age=${Math.round(ageMs / 1000)}s)`);
        return {
            cst: parsed.cst,
            xSecurityToken: parsed.xSecurityToken,
            accountIsDemo: isDemo,
            activeAccountId: row.selected_capital_account_id,
        };
    } catch (e: any) {
        console.warn('[Service] Could not load DB session:', e.message);
        return null;
    }
}

/**
 * Persist a session to the database for cross-serverless-instance sharing.
 * We store live and demo sessions separately using the session_mode column.
 */
async function saveSessionToDB(
    credAccountId: string,
    tokens: SessionTokens,
): Promise<void> {
    try {
        await db.update(capitalAccounts).set({
            encrypted_session_tokens: encrypt(JSON.stringify({
                cst: tokens.cst,
                xSecurityToken: tokens.xSecurityToken,
            })),
            session_updated_at: new Date(),
            session_mode: tokens.accountIsDemo ? 'demo' : 'live',
            selected_capital_account_id: tokens.activeAccountId,
        }).where(eq(capitalAccounts.id, credAccountId));
    } catch (e: any) {
        console.warn('[Service] Could not persist session to DB:', e.message);
    }
}

/**
 * Find the best credential account for this user.
 */
async function findCredAccount(userId: string) {
    const accounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));

    let cred = accounts.find(a => a.is_active) || accounts[0] || null;

    if (!cred) {
        const master = await db.select().from(capitalAccounts)
            .where(eq(capitalAccounts.label, 'MASTER')).limit(1);
        cred = master[0] || null;
    }

    return cred;
}

/**
 * Get (or create) a valid Capital.com session.
 *
 * KEY ARCHITECTURE INSIGHT:
 * Capital.com has two completely separate server environments:
 *   LIVE: https://api-capital.backend-capital.com
 *   DEMO: https://demo-api-capital.backend-capital.com
 *
 * The same API key and credentials work on BOTH servers, but the sessions
 * are fully independent — you cannot use a live session on the demo server
 * or vice versa. You must maintain two separate sessions.
 *
 * Caching strategy (serverless-safe):
 *   1. In-memory cache per mode (fast, lost on cold start)
 *   2. DB-persisted session per mode (survives serverless cold starts)
 *   3. Fresh POST /session on the correct server (last resort)
 */
export async function getValidSession(
    userId: string,
    isDemo: boolean = false,
    forceRefresh: boolean = false,
): Promise<SessionTokens> {
    console.log(`[Service] getValidSession: userId=${userId}, isDemo=${isDemo}, forceRefresh=${forceRefresh}`);

    const credAccount = await findCredAccount(userId);
    if (!credAccount) {
        throw new Error('No Capital.com account configured. Please set up credentials in Settings.');
    }

    const key = cacheKey(credAccount.id, isDemo);

    // 1. Check in-memory cache
    if (!forceRefresh) {
        const cached = memCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            console.log(`[Service] Memory cache HIT (${isDemo ? 'DEMO' : 'LIVE'})`);
            return cached.tokens;
        }
    }

    // 2. Check DB-persisted session (shared across serverless instances)
    if (!forceRefresh) {
        const dbSession = await loadSessionFromDB(credAccount.id, isDemo);
        if (dbSession) {
            memCache.set(key, { tokens: dbSession, expiresAt: Date.now() + SESSION_TTL_MS });
            return dbSession;
        }
    }

    // 3. Create a fresh session on the correct server
    console.log(`[Service] Cache MISS — creating fresh ${isDemo ? 'DEMO' : 'LIVE'} session...`);

    const [owner] = await db.select().from(users)
        .where(eq(users.id, credAccount.user_id)).limit(1);
    if (!owner) throw new Error('Account owner not found.');

    let apiKey: string, password: string;
    try {
        apiKey = decrypt(credAccount.encrypted_api_key);
        password = credAccount.encrypted_api_password
            ? decrypt(credAccount.encrypted_api_password) : '';
    } catch (e: any) {
        throw new Error(`Credential decryption failed: ${e.message}`);
    }
    if (!password) throw new Error('API password not set.');

    // Pass isDemo=true to createSession so it hits the DEMO server URL
    console.log(`[Service] POST /session on ${isDemo ? 'DEMO' : 'LIVE'} server for ${owner.email}...`);
    const session = await createSession(owner.email, password, apiKey, isDemo);
    console.log(`[Service] ${isDemo ? 'DEMO' : 'LIVE'} session created. currentId=${session.currentAccountId}`);

    const tokens: SessionTokens = {
        cst: session.cst,
        xSecurityToken: session.xSecurityToken,
        accountIsDemo: isDemo,
        activeAccountId: session.currentAccountId,
    };

    // Store in memory and DB
    memCache.set(key, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });
    await saveSessionToDB(credAccount.id, tokens);

    return tokens;
}

/**
 * Evict all cached sessions for a user (call after credential changes or 401 errors).
 */
export async function clearCachedSession(userId: string): Promise<void> {
    const userAccounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));

    for (const acc of userAccounts) {
        memCache.delete(cacheKey(acc.id, true));
        memCache.delete(cacheKey(acc.id, false));
    }
}
