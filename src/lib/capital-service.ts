import { db } from './db';
import { capitalAccounts, users } from './db/schema';
import { encrypt, decrypt } from './crypto';
import { createSession } from './capital';
import { eq, and } from 'drizzle-orm';

interface SessionTokens {
    cst: string;
    xSecurityToken: string;
}

/**
 * Get a valid Capital.com session, using cache if available.
 */
export async function getValidSession(userId: string, isDemo: boolean = false, forceRefresh: boolean = false): Promise<SessionTokens> {
    // 1. Find the account in the database
    // Handle 'real' alias for 'live' from UI
    const targetType = isDemo ? 'demo' : 'live';
    const accounts = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId));
    const account = accounts.find(a => a.account_type === targetType || (targetType === 'live' && a.account_type === 'real')) || accounts[0];

    if (!account) {
        throw new Error(`No Capital.com account found for environment: ${targetType}`);
    }

    // 2. Check if we have a valid cached session
    const SESSION_EXPIRY = 6 * 60 * 60 * 1000; // 6 hours
    const now = new Date();

    if (!forceRefresh && account.encrypted_session_tokens && account.session_updated_at) {
        const lastUpdate = new Date(account.session_updated_at);
        if (now.getTime() - lastUpdate.getTime() < SESSION_EXPIRY) {
            try {
                const decryptedTokens = JSON.parse(decrypt(account.encrypted_session_tokens));
                return decryptedTokens;
            } catch (err) {
                console.error("[Capital Service] Failed to decrypt cached session:", err);
            }
        }
    }

    // 3. If no valid cache, create a new session
    console.log(`[Capital Service] Generating fresh session for ${isDemo ? 'DEMO' : 'LIVE'} environment...`);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error('User not found.');

    const apiKey = decrypt(account.encrypted_api_key);
    const apiPassword = account.encrypted_api_password ? decrypt(account.encrypted_api_password) : null;

    if (!apiPassword) {
        throw new Error(`API password missing for account: ${account.id.substring(0, 8)}... (Environment: ${targetType})`);
    }

    try {
        const newSession = await createSession(user.email, apiPassword, apiKey, isDemo);

        const tokens: SessionTokens = {
            cst: newSession.cst,
            xSecurityToken: newSession.xSecurityToken
        };

        // 4. Update the cache in the database
        await db.update(capitalAccounts)
            .set({
                encrypted_session_tokens: encrypt(JSON.stringify(tokens)),
                session_updated_at: new Date()
            })
            .where(eq(capitalAccounts.id, account.id));

        return tokens;
    } catch (err: any) {
        console.error("[Capital Service] createSession failed:", err.message);
        // Do not wrap in high-level error here, let the route catch it with more context
        throw err;
    }
}

/**
 * Clear cached session tokens if they are found to be invalid.
 */
export async function clearCachedSession(userId: string, isDemo: boolean = false): Promise<void> {
    const accounts = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId));
    const account = accounts.find(a => a.account_type === (isDemo ? 'demo' : 'live')) || accounts[0];

    if (account) {
        await db.update(capitalAccounts)
            .set({
                encrypted_session_tokens: null,
                session_updated_at: null
            })
            .where(eq(capitalAccounts.id, account.id));
    }
}
