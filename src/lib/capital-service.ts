import { db } from './db';
import { capitalAccounts, users } from './db/schema';
import { encrypt, decrypt } from './crypto';
import { createSession, switchActiveAccount, getAccounts } from './capital';
import { eq } from 'drizzle-orm';

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';

export function getApiUrl(isDemo: boolean): string {
    return LIVE_API; // Always use the Live platform for routing
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
const SESSION_TTL_MS = 8 * 60 * 1000;

function cacheKey(credAccountId: string, isDemo: boolean): string {
    return `${credAccountId} -unified - ${isDemo ? 'demo' : 'live'} `;
}

async function loadSessionFromDB(credAccountId: string, isDemo: boolean): Promise<SessionTokens | null> {
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

        const expectedMode = isDemo ? 'demo' : 'live';
        if (row.session_mode !== expectedMode) return null;

        const parsed = JSON.parse(decrypt(row.encrypted_session_tokens));
        if (!parsed?.cst || !parsed?.xSecurityToken) return null;

        return {
            cst: parsed.cst,
            xSecurityToken: parsed.xSecurityToken,
            accountIsDemo: isDemo,
            activeAccountId: row.selected_capital_account_id,
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
            selected_capital_account_id: tokens.activeAccountId,
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
    const credAccount = await findCredAccount(userId);
    if (!credAccount) throw new Error('No Capital.com account configured.');

    const key = cacheKey(credAccount.id, isDemo);

    if (!forceRefresh) {
        const cached = memCache.get(key);
        if (cached && cached.expiresAt > Date.now()) return cached.tokens;
    }

    if (!forceRefresh) {
        const dbSession = await loadSessionFromDB(credAccount.id, isDemo);
        if (dbSession) {
            memCache.set(key, { tokens: dbSession, expiresAt: Date.now() + SESSION_TTL_MS });
            return dbSession;
        }
    }

    const [owner] = await db.select().from(users).where(eq(users.id, credAccount.user_id)).limit(1);
    if (!owner) throw new Error('Account owner not found.');

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

    // Always create session on LIVE server (where ALL accounts reside)
    const session = await createSession(owner.email, password, apiKey, false);

    // Now we must find the correct sub-account and lock this session to it
    // otherwise trades would execute on the default account!
    const accountsData = await getAccounts(session.cst, session.xSecurityToken, false);
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

    // Priority: 1. Previously selected ID in database, 2. Dynamic heuristic
    const targetAccountId = credAccount.selected_capital_account_id || (isDemo ? dAcc.accountId : rAcc.accountId);

    // Switch the session to the designated target account
    if (session.currentAccountId !== targetAccountId) {
        await switchActiveAccount(session.cst, session.xSecurityToken, targetAccountId, false);
    }

    const tokens: SessionTokens = {
        cst: session.cst,
        xSecurityToken: session.xSecurityToken,
        accountIsDemo: isDemo,
        activeAccountId: targetAccountId,
        serverUrl: LIVE_API,
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
