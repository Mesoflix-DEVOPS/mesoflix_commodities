import { db } from './db';
import { capitalAccounts, users } from './db/schema';
import { encrypt, decrypt } from './crypto';
import { createSession, switchActiveAccount } from './capital';
import { eq } from 'drizzle-orm';
import { appendFileSync } from 'fs';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'api-debug.log');
function log(msg: string) {
    const timestamp = new Date().toISOString();
    try {
        appendFileSync(LOG_FILE, `[${timestamp}] [Service] ${msg}\n`);
    } catch { /* ignore */ }
}

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

// In-memory session cache keyed by `{credAccountId}`.
// Capital.com sessions expire after 10 min of inactivity.
// We cache for 9 minutes to give ourselves a safe 60-second margin.
const memCache = new Map<string, CachedEntry>();
const SESSION_TTL_MS = 9 * 60 * 1000; // 9 minutes

function cacheKey(credAccountId: string): string {
    return credAccountId;
}

/**
 * Determine whether a Capital.com account entry is a Demo account.
 *
 * Capital.com returns both live and demo accounts in the same `/accounts` list.
 * Demo accounts are typically of accountType "SPREADBET" or have "Demo" in their name.
 * This heuristic covers both regional variants.
 */
function isDemoAccount(account: { accountName: string; accountType: string }): boolean {
    const name = (account.accountName || '').toLowerCase();
    const type = (account.accountType || '').toLowerCase();
    return type === 'spreadbet' || name.includes('demo');
}

/**
 * Get (or create) a valid Capital.com session for the authenticated user,
 * optionally switching to the Demo sub-account.
 *
 * How it works:
 *  1. Look up the user's master credential account in our DB.
 *  2. Check the 9-minute in-memory session cache.
 *  3. If cache miss or forceRefresh: POST /session to create a new session.
 *     The response body includes ALL accounts (live + demo).
 *  4. If isDemo=true: find the demo account from the response and call
 *     PUT /session/{accountId} to switch the active account.
 *  5. Cache the resulting tokens for 9 minutes.
 */
export async function getValidSession(
    userId: string,
    isDemo: boolean = false,
    forceRefresh: boolean = false,
): Promise<SessionTokens> {
    log(`getValidSession: userId=${userId}, isDemo=${isDemo}, forceRefresh=${forceRefresh}`);

    // 1. Find the best credential account (user's own → MASTER fallback)
    const accounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));
    log(`Found ${accounts.length} accounts in DB.`);

    let credAccount = accounts.find(a => a.is_active) || accounts[0] || null;

    if (!credAccount) {
        log(`Checking MASTER account...`);
        const master = await db.select().from(capitalAccounts)
            .where(eq(capitalAccounts.label, 'MASTER')).limit(1);
        credAccount = master[0] || null;
    }

    if (!credAccount) {
        log(`ERROR: No credentials found for userId=${userId}`);
        throw new Error('No Capital.com account configured. Please set up credentials in Settings.');
    }

    log(`Using credAccount ID=${credAccount.id}`);
    const key = cacheKey(credAccount.id);

    // 2. Check in-memory cache (only for non-forceRefresh calls)
    if (!forceRefresh) {
        const cached = memCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            // If the cached session already has the right demo/live target, return it
            if (cached.tokens.accountIsDemo === isDemo) {
                log(`Cache HIT (same mode). Reusing tokens.`);
                return cached.tokens;
            }
            // Mode changed — we need to switch accounts on the existing session
            if (cached.tokens.allAccounts && cached.tokens.allAccounts.length > 0) {
                const targetAccount = isDemo
                    ? cached.tokens.allAccounts.find(isDemoAccount)
                    : cached.tokens.allAccounts.find(a => !isDemoAccount(a));

                if (targetAccount) {
                    log(`Switching active account via PUT /session. Target: ${targetAccount.accountId}`);
                    try {
                        await switchActiveAccount(
                            cached.tokens.cst,
                            cached.tokens.xSecurityToken,
                            targetAccount.accountId,
                            false // always use LIVE endpoint for session management
                        );
                        const switched: SessionTokens = {
                            ...cached.tokens,
                            accountIsDemo: isDemo,
                            activeAccountId: targetAccount.accountId,
                        };
                        memCache.set(key, { tokens: switched, expiresAt: cached.expiresAt });
                        log(`Account switch successful. New active: ${targetAccount.accountId}`);
                        return switched;
                    } catch (switchErr: any) {
                        log(`Account switch failed: ${switchErr.message}. Will create fresh session.`);
                        // Fall through to create a fresh session below
                    }
                }
            }
        }
    }

    // 3. Create a fresh session
    log(`Cache MISS or forceRefresh. Creating new session...`);
    const [owner] = await db.select().from(users)
        .where(eq(users.id, credAccount.user_id)).limit(1);
    if (!owner) {
        log(`ERROR: Owner not found for user_id=${credAccount.user_id}`);
        throw new Error('Account owner not found.');
    }

    let apiKey: string, password: string;
    try {
        apiKey = decrypt(credAccount.encrypted_api_key);
        password = credAccount.encrypted_api_password
            ? decrypt(credAccount.encrypted_api_password)
            : '';
    } catch (decrErr: any) {
        log(`DECRYPTION FAILED: ${decrErr.message}`);
        throw new Error(`Credential Decryption Failed: ${decrErr.message}`);
    }

    if (!password) {
        log(`ERROR: API password not set for account ${credAccount.id}`);
        throw new Error('API password not set.');
    }

    // Always create the session on the LIVE endpoint — it returns live + demo accounts
    log(`Calling createSession for ${owner.email} (LIVE endpoint)...`);
    const session = await createSession(owner.email, password, apiKey, false);
    log(`Session created. currentAccountId=${session.currentAccountId}, accounts=${session.accounts.length}`);

    const allAccounts = session.accounts.map((a: any) => ({
        accountId: a.accountId,
        accountName: a.accountName,
        accountType: a.accountType,
        preferred: a.preferred,
        currency: a.currency,
    }));

    // 4. If demo mode requested, switch to the demo sub-account
    let activeAccountId = session.currentAccountId;
    let resolvedIsDemo = false;

    if (isDemo) {
        const demoAcc = allAccounts.find(isDemoAccount);
        if (demoAcc) {
            log(`Switching to demo account: ${demoAcc.accountId}`);
            try {
                await switchActiveAccount(session.cst, session.xSecurityToken, demoAcc.accountId, false);
                activeAccountId = demoAcc.accountId;
                resolvedIsDemo = true;
                log(`Demo switch OK. Active: ${activeAccountId}`);
            } catch (switchErr: any) {
                log(`Demo switch failed: ${switchErr.message}. Using live account.`);
                // Fall back to the live session
                resolvedIsDemo = false;
            }
        } else {
            log(`No demo account found in session.accounts list — using live.`);
            resolvedIsDemo = false;
        }
    } else {
        // Find the preferred/live account to confirm
        const liveAcc = allAccounts.find(a => !isDemoAccount(a) && a.preferred)
            || allAccounts.find(a => !isDemoAccount(a));
        if (liveAcc && liveAcc.accountId !== activeAccountId) {
            log(`Switching to preferred live account: ${liveAcc.accountId}`);
            try {
                await switchActiveAccount(session.cst, session.xSecurityToken, liveAcc.accountId, false);
                activeAccountId = liveAcc.accountId;
            } catch { /* already on live */ }
        }
        resolvedIsDemo = false;
    }

    const tokens: SessionTokens = {
        cst: session.cst,
        xSecurityToken: session.xSecurityToken,
        accountIsDemo: resolvedIsDemo,
        activeAccountId,
        allAccounts,
    };

    // 5. Cache for 9 minutes
    memCache.set(key, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });
    log(`Session cached. ttl=9min, accountIsDemo=${resolvedIsDemo}, activeId=${activeAccountId}`);

    // Persist to DB asynchronously (non-blocking)
    db.update(capitalAccounts).set({
        encrypted_session_tokens: encrypt(JSON.stringify({ cst: tokens.cst, xSecurityToken: tokens.xSecurityToken })),
        session_updated_at: new Date(),
        session_mode: resolvedIsDemo ? 'demo' : 'live',
        selected_capital_account_id: activeAccountId,
    }).where(eq(capitalAccounts.id, credAccount.id)).catch(() => { });

    return tokens;
}

/**
 * Evict cached session for a user (call after 401 errors).
 */
export async function clearCachedSession(userId: string): Promise<void> {
    const userAccounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));

    for (const acc of userAccounts) {
        memCache.delete(cacheKey(acc.id));
    }
}
