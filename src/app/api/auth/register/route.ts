import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, capitalAccounts, refreshTokens, campaignAnalytics } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword, encrypt } from '@/lib/crypto';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { createSession } from '@/lib/capital';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, apiKey, apiPassword, accountType } = body;
        const password = body.password || apiPassword;
        const fullName = body.fullName || body.full_name;
        const role = body.role || 'user';
        const isDemo = accountType === 'demo';

        if (!email || !password) {
            return NextResponse.json({ message: 'Missing required credentials' }, { status: 400 });
        }

        // 1. Institutional Validation
        if (apiKey && apiPassword) {
            try {
                await createSession(email, apiPassword, apiKey, isDemo);
            } catch (err: any) {
                console.error(`[Register] Capital.com Validation Failure:`, err.message);
                return NextResponse.json({ message: `Brokerage validation failed: ${err.message}` }, { status: 401 });
            }
        }

        console.log(`[Register] Identity Sync for ${email}...`);
        // 2. Identity Sync (Native Driver Failsafe)
        const checkResult = await pool.query(
            'SELECT id, email, role FROM users WHERE email = $1 LIMIT 1',
            [email.toLowerCase()]
        );
        
        const existingUser = checkResult.rows[0];

        const passwordHash = await hashPassword(password);
        let user;

        if (existingUser) {
            const [updatedUser] = await db.update(users)
                .set({
                    password_hash: passwordHash,
                    full_name: fullName || 'Trading User',
                    role: role,
                    updated_at: new Date()
                })
                .where(eq(users.id, existingUser.id))
                .returning();
            user = updatedUser;
        } else {
            const [newUser] = await db.insert(users)
                .values({
                    email: email.toLowerCase(),
                    password_hash: passwordHash,
                    full_name: fullName || 'Trading User',
                    role: role
                })
                .returning();
            user = newUser;
        }

        if (!user) throw new Error("Identity Persistence Failure");

        // 3. Credentials Encryption & account linking (Drizzle)
        if (apiKey && apiPassword) {
            const { hashApiKey } = await import('@/lib/crypto');
            const keyHash = hashApiKey(apiKey);
            const encryptedKey = encrypt(apiKey);
            const encryptedPass = encrypt(apiPassword);

            const [existingAccount] = await db.select()
                .from(capitalAccounts)
                .where(eq(capitalAccounts.user_id, user.id))
                .limit(1);

            if (existingAccount) {
                await db.update(capitalAccounts)
                    .set({
                        encrypted_api_key: encryptedKey,
                        encrypted_api_password: encryptedPass,
                        api_key_hash: keyHash,
                        capital_account_id: email.toLowerCase(),
                        is_active: true,
                        account_type: accountType || 'demo',
                        updated_at: new Date()
                    })
                    .where(eq(capitalAccounts.id, existingAccount.id));
            } else {
                await db.insert(capitalAccounts)
                    .values({
                        user_id: user.id,
                        encrypted_api_key: encryptedKey,
                        encrypted_api_password: encryptedPass,
                        api_key_hash: keyHash,
                        capital_account_id: email.toLowerCase(),
                        is_active: true,
                        account_type: accountType || 'demo'
                    });
            }
        }

        console.log(`[Register] Issuing session tokens...`);
        // 4. Session & Handshake
        const accessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
            tokenVersion: user.token_version || 0,
        });

        const refreshToken = generateRefreshToken();

        await db.insert(refreshTokens).values({
            user_id: user.id,
            token_hash: refreshToken,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        });

        await setAuthCookies(accessToken, refreshToken);

        // 5. Campaign Tracking
        try {
            const cookieStore = await cookies();
            const assignmentId = cookieStore.get('campaign_assignment_id')?.value;
            if (assignmentId) {
                await db.insert(campaignAnalytics).values({
                    assignment_id: assignmentId,
                    event_type: 'LEAD',
                    user_id: user.id,
                    metadata: JSON.stringify({ source: 'registration' })
                });
            }
        } catch (e) {
            console.error('[Registration] Failed to record lead analytics:', e);
        }

        return NextResponse.json({
            message: 'Registration successful',
            user: { id: user.id, email: user.email, name: user.full_name }
        });

    } catch (error: any) {
        console.error('Registration Bridge Failure (Full Error):', error);
        return NextResponse.json({ message: `Security Bridge Offline: ${error.message}` }, { status: 500 });
    }
}
