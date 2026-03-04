import { db, withRetry } from './db';
import { capitalAccounts, users } from './db/schema';
import { encrypt, decrypt } from './crypto';
import { createSession, switchActiveAccount, getAccounts } from './capital';
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
    serverUrl: string;
}

interface CachedEntry {
    tokens: SessionTokens;
    expiresAt: number;
}

const memCache = new Map<string, CachedEntry>();
const credCache = new Map<string, { data: any, expiresAt: number }>();
const SESSION_TTL_MS = 8 * 60 * 1000;
const CRED_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheKey(credAccountId: string, isDemo: boolean): string {
    return `${credAccountId}-unified-${isDemo ? 'demo' : 'live'}`;
}

async function loadSessionFromDB(credAccountId: string, isDemo: boolean): Promise<SessionTokens | null> {
    try {
        const [row] = await db
            .select({
                encrypted_session_tokens: capitalAccounts.encrypted_session_tokens,
                session_updated_at: capitalAccounts.session_updated_at,
                session_mode: capitalAccounts.session_mode,
                selected_real_account_id: capitalAccounts.selected_real_account_id,
                selected_demo_account_id: capitalAccounts.selected_demo_account_id,
            })
            .from(capitalAccounts)
            .where(eq(capitalAccounts.id, credAccountId))
            .limit(1);

        if (!row?.encrypted_session_tokens || !row?.session_updated_at) return null;

        const ageMs = Date.now() - row.session_updated_at.getTime();
        if (ageMs > SESSION_TTL_MS) return null;

        const expectedMode = isDemo ? 'demo' : 'live';
        if (row.session_mode !== expectedMode) return null;

        const parsed = JSON.parse(decrypt(row.encrypted_session_tokens));
        if (!parsed?.cst || !parsed?.xSecurityToken) return null;

        return {
            cst: parsed.cst,
            xSecurityToken: parsed.xSecurityToken,
            accountIsDemo: isDemo,
            activeAccountId: isDemo ? row.selected_demo_account_id : row.selected_real_account_id,
            serverUrl: LIVE_API,
        };
    } catch (e: any) {
        return null;
    }
}

async function saveSessionToDB(credAccountId: string, tokens: SessionTokens): Promise<void> {
    try {
        await db.update(capitalAccounts).set({
            encrypted_session_tokens: encrypt(JSON.stringify({
                cst: tokens.cst,
                xSecurityToken: tokens.xSecurityToken,
                serverUrl: tokens.serverUrl,
            })),
            session_updated_at: new Date(),
            session_mode: tokens.accountIsDemo ? 'demo' : 'live',
            [tokens.accountIsDemo ? 'selected_demo_account_id' : 'selected_real_account_id']: tokens.activeAccountId,
            selected_capital_account_id: tokens.activeAccountId, // Keep legacy in sync
        }).where(eq(capitalAccounts.id, credAccountId));
    } catch (e: any) { }
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

export async function getValidSession(
    userId: string,
    isDemo: boolean = false,
    forceRefresh: boolean = false,
): Promise<SessionTokens> {
    // 1. Try to get credAccount from cache first
    let credAccount;
    const now = Date.now();
    const cachedCred = credCache.get(userId);

    if (cachedCred && cachedCred.expiresAt > now && !forceRefresh) {
        credAccount = cachedCred.data;
    } else {
        credAccount = await withRetry(() => findCredAccount(userId));
        if (credAccount) {
            credCache.set(userId, { data: credAccount, expiresAt: now + CRED_TTL_MS });
        }
    }

    if (!credAccount) throw new Error('No Capital.com account configured.');

    const key = cacheKey(credAccount.id, isDemo);

    if (!forceRefresh) {
        const cached = memCache.get(key);
        if (cached && cached.expiresAt > now) return cached.tokens;
    }

    if (!forceRefresh) {
        const cached = await withRetry(() => loadSessionFromDB(credAccount.id, isDemo));
        if (cached) {
            memCache.set(key, { tokens: cached, expiresAt: now + SESSION_TTL_MS });
            return cached;
        }
    }

    const [owner] = await withRetry(() => db.select().from(users).where(eq(users.id, credAccount.user_id)).limit(1));
    if (!owner) {
        console.error(`[Service] Owner not found for userId=${credAccount.user_id}`);
        throw new Error('Account owner not found.');
    }

    let apiKey: string, password: string;
    try {
        const decryptedKey = decrypt(credAccount.encrypted_api_key);
        if (decryptedKey.startsWith('{') && decryptedKey.includes('"apiKey"')) {
            const parsed = JSON.parse(decryptedKey);
            apiKey = parsed.apiKey;
            password = parsed.password;
        } else {
            apiKey = decryptedKey;
            password = credAccount.encrypted_api_password ? decrypt(credAccount.encrypted_api_password) : '';
        }
    } catch (e: any) {
        throw new Error(`Credential decryption failed: ${e.message} `);
    }
    if (!password) throw new Error('API password not set.');

    // Try to create session on the requested environment
    let session;
    let usedUrl = getApiUrl(isDemo);
    try {
        session = await createSession(owner.email, password, apiKey, isDemo);
    } catch (e) {
        if (isDemo) {
            // Fallback to Live if Demo create failed (might be Unified CFD)
            session = await createSession(owner.email, password, apiKey, false);
            usedUrl = LIVE_API;
        } else {
            throw e;
        }
    }

    // Now we must find the correct sub-account and lock this session to it
    // otherwise trades would execute on the default account!
    const accountsData = await getAccounts(session.cst, session.xSecurityToken, false, usedUrl);
    const accounts = accountsData?.accounts || [];

    if (accounts.length === 0) throw new Error('No accounts found inside session');

    let demoAccs = accounts.filter((a: any) => a.accountType === 'SPREADBET' || (a.accountName || '').toLowerCase().includes('demo'));
    let realAccs = accounts.filter((a: any) => a.accountType !== 'SPREADBET' && !(a.accountName || '').toLowerCase().includes('demo'));

    // Unified CFD heuristic
    if (demoAccs.length === 0 && realAccs.length > 1) {
        const gbpAcc = realAccs.find((a: any) => a.currency === 'GBP');
        const usdAcc = realAccs.find((a: any) => a.currency === 'USD');
        if (gbpAcc && usdAcc) {
            demoAccs = [gbpAcc];
            realAccs = [usdAcc];
        } else {
            demoAccs = [realAccs.find((a: any) => a.preferred) || realAccs[1]];
            realAccs = [realAccs.find((a: any) => !a.preferred) || realAccs[0]];
        }
    }

    const rAcc = realAccs[0] || accounts[0];
    const dAcc = demoAccs[0] || accounts[1] || accounts[0];

    // Priority: 1. Mode-specific preferred ID in database, 2. Dynamic heuristic
    let targetAccountId = isDemo ? credAccount.selected_demo_account_id : credAccount.selected_real_account_id;

    // Validate that the selected account matches the requested mode
    const isValidForMode = isDemo
        ? demoAccs.some((a: any) => a.accountId === targetAccountId)
        : realAccs.some((a: any) => a.accountId === targetAccountId);

    if (!targetAccountId || !isValidForMode) {
        targetAccountId = isDemo ? dAcc.accountId : rAcc.accountId;
    }

    if (!targetAccountId) throw new Error("Could not determine target account ID");

    // Switch the session to the designated target account
    if (session.currentAccountId !== targetAccountId) {
        await switchActiveAccount(session.cst, session.xSecurityToken, targetAccountId, usedUrl === DEMO_API);
    }

    const tokens: SessionTokens = {
        cst: session.cst,
        xSecurityToken: session.xSecurityToken,
        accountIsDemo: isDemo,
        activeAccountId: targetAccountId,
        serverUrl: usedUrl,
    };

    memCache.set(key, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });
    await saveSessionToDB(credAccount.id, tokens);

    return tokens;
}

export async function clearCachedSession(userId: string): Promise<void> {
    const userAccounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));
    for (const acc of userAccounts) {
        memCache.delete(cacheKey(acc.id, true));
        memCache.delete(cacheKey(acc.id, false));
    }
}
