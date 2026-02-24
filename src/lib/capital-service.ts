import { db } from './db';
import { capitalAccounts, users } from './db/schema';
import { encrypt, decrypt } from './crypto';
import { createSession } from './capital';
import { eq, and } from 'drizzle-orm';
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
    accountIsDemo?: boolean;
    selectedAccountId?: string | null;
}

interface CachedEntry {
    tokens: SessionTokens;
    expiresAt: number;
}
const memCache = new Map<string, CachedEntry>();
const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function memKey(accountId: string, isDemo: boolean) {
    return `${accountId}:${isDemo ? 'demo' : 'live'}`;
}

export async function getValidSession(
    userId: string,
    isDemo: boolean = false,
    forceRefresh: boolean = false,
): Promise<SessionTokens> {
    log(`getValidSession: userId=${userId}, isDemo=${isDemo}`);

    try {
        // 1. Find the best account for credentials
        const accounts = await db.select().from(capitalAccounts)
            .where(eq(capitalAccounts.user_id, userId));
        log(`Found ${accounts.length} accounts in DB.`);

        let credAccount = accounts.find(a => a.is_active) || accounts[0] || null;

        if (!credAccount) {
            log(`Checking Master account...`);
            const master = await db.select().from(capitalAccounts)
                .where(eq(capitalAccounts.label, 'MASTER')).limit(1);
            credAccount = master[0] || null;
        }

        if (!credAccount) {
            log(`ERROR: No account found.`);
            throw new Error('No Capital.com account configured. Please set up credentials in Settings.');
        }

        log(`Using account ID=${credAccount.id}`);
        const cacheKey = memKey(credAccount.id, isDemo);

        // 2. Check in-memory cache
        if (!forceRefresh) {
            const cached = memCache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                log(`Using memory cache.`);
                return {
                    ...cached.tokens,
                    selectedAccountId: credAccount.selected_capital_account_id,
                };
            }
        }

        // 3. Fresh session creation
        log(`Creating fresh session. Fetching owner (userId=${credAccount.user_id})...`);
        const [owner] = await db.select().from(users).where(eq(users.id, credAccount.user_id)).limit(1);
        if (!owner) {
            log(`ERROR: Owner not found.`);
            throw new Error('Account owner not found.');
        }

        log(`Decrypting credentials...`);
        let apiKey: string, password: string | null;
        try {
            apiKey = decrypt(credAccount.encrypted_api_key);
            password = credAccount.encrypted_api_password ? decrypt(credAccount.encrypted_api_password) : null;
        } catch (decrErr: any) {
            log(`DECRYPTION FAILED: ${decrErr.message}. Format issue or KEY mismatch.`);
            throw new Error(`Credential Decryption Failed: ${decrErr.message}`);
        }

        if (!password) {
            log(`ERROR: Password missing.`);
            throw new Error('API password not set.');
        }

        log(`Calling createSession for ${owner.email} (isDemo=${isDemo})...`);
        try {
            const newSession = await createSession(owner.email, password, apiKey, isDemo);
            log(`Session created successfully.`);
            const tokens: SessionTokens = {
                cst: newSession.cst,
                xSecurityToken: newSession.xSecurityToken,
                accountIsDemo: isDemo,
                selectedAccountId: credAccount.selected_capital_account_id,
            };

            memCache.set(cacheKey, { tokens, expiresAt: Date.now() + SESSION_TTL_MS });

            db.update(capitalAccounts).set({
                encrypted_session_tokens: encrypt(JSON.stringify(tokens)),
                session_updated_at: new Date(),
            }).where(eq(capitalAccounts.id, credAccount.id)).catch(() => { });

            return tokens;
        } catch (sessionErr: any) {
            if (isDemo) {
                log(`Demo session failed: ${sessionErr.message}. Falling back to live...`);
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
            log(`Session error: ${sessionErr.message}`);
            throw sessionErr;
        }
    } catch (fatalErr: any) {
        log(`FATAL getValidSession error: ${fatalErr.message}`);
        throw fatalErr;
    }
}

export async function clearCachedSession(userId: string, isDemo: boolean = false): Promise<void> {
    const userAccounts = await db.select().from(capitalAccounts)
        .where(eq(capitalAccounts.user_id, userId));

    for (const acc of userAccounts) {
        const cacheKey = memKey(acc.id, isDemo);
        memCache.delete(cacheKey);
        if (!acc.session_mode || acc.session_mode === (isDemo ? 'demo' : 'live')) {
            await db.update(capitalAccounts)
                .set({
                    encrypted_session_tokens: null,
                    session_updated_at: null,
                    session_mode: null
                })
                .where(eq(capitalAccounts.id, acc.id));
        }
    }
}
