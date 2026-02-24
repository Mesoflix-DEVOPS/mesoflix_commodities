import { db } from './db';
import { capitalAccounts, users } from './db/schema';
import { encrypt, decrypt } from './crypto';
import { createSession, switchActiveAccount } from './capital';
import { eq } from 'drizzle-orm';

export interface SessionTokens {
    cst: string;
    xSecurityToken: string;
    /** Whether the ACTIVE sub-account is a Demo account */
    accountIsDemo?: boolean;
    /** The Capital.com accountId that is currently active */
    activeAccountId?: string | null;
    /** All accounts associated with the session */
    allAccounts?: Array<{
        accountId: string;
        accountName: string;
        accountType: string;
        preferred: boolean;
        currency: string;
    }>;
}

interface CachedEntry {
    tokens: SessionTokens;
    /** Epoch ms when this entry expires */
    expiresAt: number;
}

// ─── In-memory cache (works only within the same serverless warm instance) ───
// Serverless functions may spin up fresh instances where this Map is empty.
// We supplement with DB-backed persistence below.
const memCache = new Map<string, CachedEntry>();

// Capital.com sessions expire after 10 min of inactivity.
// We cache for 8 minutes to give a 2-minute safety margin.
const SESSION_TTL_MS = 8 * 60 * 1000; // 8 minutes

function cacheKey(credAccountId: string): string {
    return credAccountId;
}

/**
 * Determine whether a Capital.com account is a Demo account.
 * Demo accounts are typically accountType "SPREADBET" or have "Demo" in name.
 */
function isDemoAccount(account: { accountName: string; accountType: string }): boolean {
    const name = (account.accountName || '').toLowerCase();
    const type = (account.accountType || '').toLowerCase();
    return type === 'spreadbet' || name.includes('demo');
}

/**
 * Try to load a still-valid session from the database.
 * Since Netlify serverless functions don't share in-memory state, we persist
 * the CST + X-SECURITY-TOKEN to the DB and read them back before hitting Capital.com.
 */
async function loadSessionFromDB(credAccountId: string): Promise<SessionTokens | null> {
    try {
        const [row] = await db.select({
            encrypted_session_tokens: capitalAccounts.encrypted_session_tokens,
            session_updated_at: capitalAccounts.session_updated_at,
            session_mode: capitalAccounts.session_mode,
            selected_capital_account_id: capitalAccounts.selected_capital_account_id,
        }).from(capitalAccounts).where(eq(capitalAccounts.id, credAccountId)).limit(1);

        if (!row?.encrypted_session_tokens || !row?.session_updated_at) return null;

        const ageMs = Date.now() - row.session_updated_at.getTime();
        if (ageMs > SESSION_TTL_MS) {
            console.log(`[Service] DB session too old (${Math.round(ageMs / 1000)}s). Will create fresh.`);
            return null;
        }

        const parsed = JSON.parse(decrypt(row.encrypted_session_tokens));
        if (!parsed?.cst || !parsed?.xSecurityToken) return null;

        console.log(`[Service] Restored session from DB (age=${Math.round(ageMs / 1000)}s)`);
        return {
            cst: parsed.cst,
            xSecurityToken: parsed.xSecurityToken,
            accountIsDemo: row.session_mode === 'demo',
            activeAccountId: row.selected_capital_account_id,
            allAccounts: parsed.allAccounts || [],
        };
    } catch (e: any) {
        console.warn('[Service] Could not load DB session:', e.message);
        return null;
    }
}

/**
 * Persist session tokens to the DB so other serverless invocations can reuse them.
 */
async function saveSessionToDB(
    credAccountId: string,
    tokens: SessionTokens,
    isDemo: boolean,
    activeAccountId: string | null | undefined
): Promise<void> {
    try {
        await db.update(capitalAccounts).set({
            encrypted_session_tokens: encrypt(JSON.stringify({
                cst: tokens.cst,
                xSecurityToken: tokens.xSecurityToken,
                allAccounts: tokens.allAccounts || [],
            })),
            session_updated_at: new Date(),
            session_mode: isDemo ? 'demo' : 'live',
            selected_capital_account_id: activeAccountId,
        }).where(eq(capitalAccounts.id, credAccountId));
    } catch (e: any) {
        console.warn('[Service] Could not persist session to DB:', e.message);
    }
}

/**
 * Get (or create) a valid Capital.com session for the authenticated user,
 * optionally switching to the Demo sub-account.
 *
 * Session persistence strategy (serverless-safe):
 *  1. Check in-process memory cache (fast but not shared across instances)
 *  2. Check DB-stored session (shared across all serverless instances)
 *  3. Create a fresh session via POST /session (slow, rate-limited)
 *
 * Demo/Live switching:
 *  - Capital.com uses PUT /session with {accountId} to switch sub-accounts
 *  - We don't create two separate sessions
 */
export async function getValidSession(
    userId: string,
    isDemo: boolean = false,
    forceRefresh: boolean = false,
): Promise<SessionTokens> {
    console.log(`[Service] getValidSession: userId=${userId}, isDemo=${isDemo}, forceRefresh=${forceRefresh}`);

    // 1. Find best credential account in DB
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

    const key = cacheKey(credAccount.id);

    // 2. Check in-memory cache
    if (!forceRefresh) {
        const cached = memCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            if (cached.tokens.accountIsDemo === isDemo) {
                console.log('[Service] In-memory cache HIT (same mode)');
                return cached.tokens;
            }
            // Mode switch using cached tokens
            const switched = await trySwitchAccount(cached.tokens, isDemo, key, credAccount.id);
            if (switched) return switched;
        }
    }

    // 3. Check DB-persisted session (serverless-safe)
    if (!forceRefresh) {
        const dbSession = await loadSessionFromDB(credAccount.id);
        if (dbSession) {
            if (dbSession.accountIsDemo === isDemo) {
                // Store back in memory cache for this warm instance
                memCache.set(key, { tokens: dbSession, expiresAt: Date.now() + SESSION_TTL_MS });
                console.log('[Service] DB session HIT (same mode)');
                return dbSession;
            }
            // Mode switch using DB session
            const switched = await trySwitchAccount(dbSession, isDemo, key, credAccount.id);
            if (switched) {
                await saveSessionToDB(credAccount.id, switched, isDemo, switched.activeAccountId);
                return switched;
            }
        }
    }

    // 4. Create a fresh session
    console.log('[Service] Cache MISS — creating fresh session...');
    const [owner] = await db.select().from(users)
        .where(eq(users.id, credAccount.user_id)).limit(1);
    if (!owner) throw new Error('Account owner not found.');

    let apiKey: string, password: string;
    try {
        apiKey = decrypt(credAccount.encrypted_api_key);
        password = credAccount.encrypted_api_password
            ? decrypt(credAccount.encrypted_api_password) : '';
    } catch (decrErr: any) {
        throw new Error(`Credential decryption failed: ${decrErr.message}`);
    }

    if (!password) throw new Error('API password not set.');

    // Always POST to LIVE endpoint — it returns both live and demo accounts
    console.log(`[Service] POST /session for ${owner.email}...`);
    const session = await createSession(owner.email, password, apiKey, false);
    console.log(`[Service] Session created. accounts=${session.accounts.length}`);

    const allAccounts = session.accounts.map((a: any) => ({
        accountId: a.accountId,
        accountName: a.accountName,
        accountType: a.accountType,
        preferred: a.preferred,
        currency: a.currency,
    }));

    // Switch to desired sub-account
    let activeAccountId = session.currentAccountId;
    let resolvedIsDemo = false;

    if (isDemo) {
        const demoAcc = allAccounts.find(isDemoAccount);
        if (demoAcc) {
            try {
                console.log(`[Service] Switching to demo: ${demoAcc.accountId}`);
                await switchActiveAccount(session.cst, session.xSecurityToken, demoAcc.accountId, false);
                activeAccountId = demoAcc.accountId;
                resolvedIsDemo = true;
            } catch (e: any) {
                console.warn('[Service] Demo switch failed:', e.message);
            }
        } else {
            console.warn('[Service] No demo account found in accounts list');
        }
    } else {
        const liveAcc = allAccounts.find(a => !isDemoAccount(a) && a.preferred)
            || allAccounts.find(a => !isDemoAccount(a));
        if (liveAcc && liveAcc.accountId !== activeAccountId) {
            try {
                await switchActiveAccount(session.cst, session.xSecurityToken, liveAcc.accountId, false);
                activeAccountId = liveAcc.accountId;
            } catch { /* already on live */ }
        }
    }

    const tokens: SessionTokens = {
        cst: session.cst,
        xSecurityToken: session.xSecurityToken,
        accountIsDemo: resolvedIsDemo,
        activeAccountId,
        allAccounts,
    };

    // Cache in memory
    memCache.set(key, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });

    // Persist to DB for cross-instance sharing
    await saveSessionToDB(credAccount.id, tokens, resolvedIsDemo, activeAccountId);

    console.log(`[Service] Session cached. isDemo=${resolvedIsDemo}, activeId=${activeAccountId}`);
    return tokens;
}

/**
 * Attempt to switch the active account on an existing session.
 * Returns the updated tokens, or null if switch fails.
 */
async function trySwitchAccount(
    tokens: SessionTokens,
    isDemo: boolean,
    key: string,
    credAccountId: string,
): Promise<SessionTokens | null> {
    const accounts = tokens.allAccounts || [];
    if (accounts.length === 0) return null;

    const targetAcc = isDemo
        ? accounts.find(isDemoAccount)
        : accounts.find(a => !isDemoAccount(a) && a.preferred) || accounts.find(a => !isDemoAccount(a));

    if (!targetAcc) {
        console.warn(`[Service] No ${isDemo ? 'demo' : 'live'} account found for mode switch`);
        return null;
    }

    try {
        console.log(`[Service] PUT /session to switch to ${isDemo ? 'DEMO' : 'LIVE'}: ${targetAcc.accountId}`);
        await switchActiveAccount(tokens.cst, tokens.xSecurityToken, targetAcc.accountId, false);
        const switched: SessionTokens = {
            ...tokens,
            accountIsDemo: isDemo,
            activeAccountId: targetAcc.accountId,
        };
        memCache.set(key, { tokens: switched, expiresAt: Date.now() + SESSION_TTL_MS });
        return switched;
    } catch (e: any) {
        console.warn('[Service] Account switch failed (session may be stale):', e.message);
        memCache.delete(key); // evict stale entry
        return null;
    }
}

/**
 * Evict cached session for a user (call after 401 errors or account changes).
 */
export async function clearCachedSession(userId: string): Promise<void> {
    const userAccounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));

    for (const acc of userAccounts) {
        memCache.delete(cacheKey(acc.id));
    }
}
