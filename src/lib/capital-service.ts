import { db } from './db';
import { capitalAccounts, users } from './db/schema';
import { encrypt, decrypt } from './crypto';
import { createSession } from './capital';
import { eq } from 'drizzle-orm';

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
    /** Which Capital.com server these tokens belong to */
    serverUrl: string;
}

interface CachedEntry {
    tokens: SessionTokens;
    expiresAt: number;
}

// Two separate in-memory caches — one per server
// Key: `${credAccountId}-live` or `${credAccountId}-demo`
const memCache = new Map<string, CachedEntry>();

// Capital.com sessions expire after 10 min of inactivity — we cache for 8 min
const SESSION_TTL_MS = 8 * 60 * 1000;

function cacheKey(credAccountId: string, isDemo: boolean): string {
    return `${credAccountId}-${isDemo ? 'demo' : 'live'}`;
}

/**
 * Try to restore a valid session from the database.
 *
 * IMPORTANT: We store the server URL inside the encrypted token.
 * If the stored server URL doesn't match what we need (e.g., old code stored
 * a demo session under session_mode='live'), we reject it and create a fresh one.
 */
async function loadSessionFromDB(
    credAccountId: string,
    isDemo: boolean,
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

        const ageMs = Date.now() - row.session_updated_at.getTime();
        if (ageMs > SESSION_TTL_MS) return null;

        const parsed = JSON.parse(decrypt(row.encrypted_session_tokens));
        if (!parsed?.cst || !parsed?.xSecurityToken) return null;

        const expectedUrl = getApiUrl(isDemo);

        // CRITICAL: Reject tokens if they were created for a different server.
        // Old sessions without serverUrl stored are automatically rejected.
        if (!parsed.serverUrl || parsed.serverUrl !== expectedUrl) {
            console.log(
                `[Service] DB session rejected — server mismatch.` +
                ` stored="${parsed.serverUrl || 'none'}" expected="${expectedUrl}"`
            );
            return null;
        }

        console.log(`[Service] DB session OK for ${isDemo ? 'DEMO' : 'LIVE'} (age=${Math.round(ageMs / 1000)}s)`);
        return {
            cst: parsed.cst,
            xSecurityToken: parsed.xSecurityToken,
            accountIsDemo: isDemo,
            activeAccountId: row.selected_capital_account_id,
            serverUrl: parsed.serverUrl,
        };
    } catch (e: any) {
        console.warn('[Service] Could not load DB session:', e.message);
        return null;
    }
}

/**
 * Persist a session to the DB (shared across serverless invocations).
 * The server URL is stored inside the encrypted payload so we can verify it on load.
 */
async function saveSessionToDB(credAccountId: string, tokens: SessionTokens): Promise<void> {
    try {
        await db.update(capitalAccounts).set({
            encrypted_session_tokens: encrypt(JSON.stringify({
                cst: tokens.cst,
                xSecurityToken: tokens.xSecurityToken,
                serverUrl: tokens.serverUrl, // ← stored so we can validate later
            })),
            session_updated_at: new Date(),
            session_mode: tokens.accountIsDemo ? 'demo' : 'live',
            selected_capital_account_id: tokens.activeAccountId,
        }).where(eq(capitalAccounts.id, credAccountId));
    } catch (e: any) {
        console.warn('[Service] Could not persist session to DB:', e.message);
    }
}

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
 * Get (or create) a valid Capital.com session for the correct server.
 *
 * Capital.com has two entirely separate environments:
 *   LIVE: https://api-capital.backend-capital.com
 *   DEMO: https://demo-api-capital.backend-capital.com
 *
 * The same API key + password works on BOTH servers, but sessions are independent.
 * We maintain two separate sessions and NEVER mix tokens between servers.
 *
 * Session lookup priority (serverless-safe):
 *   1. In-memory cache (fast, warm instance only)
 *   2. DB-persisted session with matching server URL (shared across instances)
 *   3. Fresh POST /session on the correct server (rate-limited — last resort)
 */
export async function getValidSession(
    userId: string,
    isDemo: boolean = false,
    forceRefresh: boolean = false,
): Promise<SessionTokens> {
    const serverUrl = getApiUrl(isDemo);
    console.log(`[Service] getValidSession: userId=${userId}, server=${isDemo ? 'DEMO' : 'LIVE'}, forceRefresh=${forceRefresh}`);

    const credAccount = await findCredAccount(userId);
    if (!credAccount) {
        throw new Error('No Capital.com account configured.');
    }

    const key = cacheKey(credAccount.id, isDemo);

    // 1. In-memory cache
    if (!forceRefresh) {
        const cached = memCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            // Extra safety: verify the cached token belongs to the right server
            if (cached.tokens.serverUrl === serverUrl) {
                console.log(`[Service] Memory cache HIT (${isDemo ? 'DEMO' : 'LIVE'})`);
                return cached.tokens;
            }
            console.warn('[Service] Memory cache has wrong serverUrl — evicting');
            memCache.delete(key);
        }
    }

    // 2. DB-persisted session (server URL validated inside loadSessionFromDB)
    if (!forceRefresh) {
        const dbSession = await loadSessionFromDB(credAccount.id, isDemo);
        if (dbSession) {
            memCache.set(key, { tokens: dbSession, expiresAt: Date.now() + SESSION_TTL_MS });
            return dbSession;
        }
    }

    // 3. Create a fresh session
    console.log(`[Service] Creating fresh ${isDemo ? 'DEMO' : 'LIVE'} session on ${serverUrl}...`);

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

    const session = await createSession(owner.email, password, apiKey, isDemo);
    console.log(`[Service] ${isDemo ? 'DEMO' : 'LIVE'} session created. currentId=${session.currentAccountId}`);

    const tokens: SessionTokens = {
        cst: session.cst,
        xSecurityToken: session.xSecurityToken,
        accountIsDemo: isDemo,
        activeAccountId: session.currentAccountId,
        serverUrl, // ← always set correctly
    };

    memCache.set(key, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });
    await saveSessionToDB(credAccount.id, tokens);

    return tokens;
}

/**
 * Evict all cached sessions for a user.
 */
export async function clearCachedSession(userId: string): Promise<void> {
    const userAccounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));

    for (const acc of userAccounts) {
        memCache.delete(cacheKey(acc.id, true));
        memCache.delete(cacheKey(acc.id, false));
    }
}
