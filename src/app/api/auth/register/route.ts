import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
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
        const passwordHash = await hashPassword(password);
        const emailLower = email.toLowerCase();
        
        let user;
        const checkResult = await pool.query(
            'SELECT id, email, role, token_version FROM users WHERE email = $1 LIMIT 1',
            [emailLower]
        );
        
        if (checkResult.rows.length > 0) {
            const existingUser = checkResult.rows[0];
            const updateRes = await pool.query(
                `UPDATE users 
                 SET password_hash = $1, full_name = $2, role = $3, updated_at = NOW() 
                 WHERE id = $4 RETURNING id, email, full_name, role, token_version`,
                [passwordHash, fullName || 'Trading User', role, existingUser.id]
            );
            user = updateRes.rows[0];
        } else {
            const insertRes = await pool.query(
                `INSERT INTO users (email, password_hash, full_name, role) 
                 VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, token_version`,
                [emailLower, passwordHash, fullName || 'Trading User', role]
            );
            user = insertRes.rows[0];
        }

        if (!user) throw new Error("Identity Persistence Failure");

        // 3. Credentials Encryption & account linking
        if (apiKey && apiPassword) {
            const { hashApiKey } = await import('@/lib/crypto');
            const keyHash = hashApiKey(apiKey);
            const encryptedKey = encrypt(apiKey);
            const encryptedPass = encrypt(apiPassword);

            const accCheck = await pool.query('SELECT id FROM capital_accounts WHERE user_id = $1 LIMIT 1', [user.id]);
            
            if (accCheck.rows.length > 0) {
                await pool.query(
                    `UPDATE capital_accounts 
                     SET encrypted_api_key = $1, encrypted_api_password = $2, api_key_hash = $3, 
                         capital_account_id = $4, is_active = true, account_type = $5, updated_at = NOW() 
                     WHERE id = $6`,
                    [encryptedKey, encryptedPass, keyHash, emailLower, accountType || 'demo', accCheck.rows[0].id]
                );
            } else {
                await pool.query(
                    `INSERT INTO capital_accounts (user_id, encrypted_api_key, encrypted_api_password, api_key_hash, capital_account_id, is_active, account_type) 
                     VALUES ($1, $2, $3, $4, $5, true, $6)`,
                    [user.id, encryptedKey, encryptedPass, keyHash, emailLower, accountType || 'demo']
                );
            }
        }

        // 4. Session & Handshake
        const accessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
            tokenVersion: user.token_version || 0,
        });

        const refreshToken = generateRefreshToken();
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'3 days\')',
            [user.id, refreshToken]
        );

        await setAuthCookies(accessToken, refreshToken);

        // 5. Institutional Campaign Tracking (Lead Capture)
        try {
            const cookieStore = await cookies();
            const assignmentId = cookieStore.get('campaign_assignment_id')?.value;
            if (assignmentId) {
                // Ensure we record the LEAD event with user reference for full attribution
                await pool.query(
                    `INSERT INTO campaign_analytics (assignment_id, event_type, user_id, metadata) 
                     VALUES ($1, 'LEAD', $2, $3)`,
                    [assignmentId, user.id, JSON.stringify({ source: 'registration', email: user.email })]
                );
                console.log(`[Campaign] Lead attributed to assignment: ${assignmentId}`);
            }
        } catch (e) {
            console.error('[Registration] Analytics bridge warning:', e);
        }

        return NextResponse.json({
            message: 'Registration successful',
            user: { id: user.id, email: user.email, name: user.full_name }
        });

    } catch (error: any) {
        console.error('Registration Bridge Failure:', error);
        return NextResponse.json({ message: `Security Bridge Offline: ${error.message}` }, { status: 500 });
    }
}
