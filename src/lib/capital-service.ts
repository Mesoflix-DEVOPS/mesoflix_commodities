import { db } from './db';
import { capitalAccounts, users, systemSettings } from './db/schema';
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
    const targetType = isDemo ? 'demo' : 'live';
    const SESSION_EXPIRY = 6 * 60 * 60 * 1000; // 6 hours
    const now = new Date();

    // 1. Try to find a user-specific account first
    const accounts = await db.select().from(capitalAccounts).where(eq(capitalAccounts.user_id, userId));
    const userAccount = accounts.find(a => a.account_type === targetType || (targetType === 'live' && a.account_type === 'real')) || accounts[0];

    if (!userAccount) {
        throw new Error(`Personal Capital.com account not setup for ${targetType} mode.`);
    }

    // User has their own Capital.com account
    if (!forceRefresh && userAccount.encrypted_session_tokens && userAccount.session_updated_at) {
        const lastUpdate = new Date(userAccount.session_updated_at);
        if (now.getTime() - lastUpdate.getTime() < SESSION_EXPIRY) {
            try {
                return JSON.parse(decrypt(userAccount.encrypted_session_tokens));
            } catch (err) {
                console.error("[Capital Service] Failed to decrypt cached session for user account:", err);
            }
        }
    }

    console.log(`[Capital Service] Generating fresh session for user ${userId.substring(0, 8)} (${targetType})...`);
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error('User not found.');

    const apiKey = decrypt(userAccount.encrypted_api_key);
    const apiPassword = userAccount.encrypted_api_password ? decrypt(userAccount.encrypted_api_password) : null;

    if (!apiPassword) {
        throw new Error(`API password missing for user account: ${userAccount.id.substring(0, 8)}...`);
    }

    try {
        const newSession = await createSession(user.email, apiPassword, apiKey, isDemo);
        const tokens: SessionTokens = { cst: newSession.cst, xSecurityToken: newSession.xSecurityToken };

        await db.update(capitalAccounts)
            .set({
                encrypted_session_tokens: encrypt(JSON.stringify(tokens)),
                session_updated_at: new Date()
            })
            .where(eq(capitalAccounts.id, userAccount.id));

        return tokens;
    } catch (err: any) {
        console.error(`[Capital Service] createSession failed for user ${userId.substring(0, 8)}:`, err.message);
        throw new Error(`Capital Connection Error: ${err.message}`);
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
