import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword, encrypt } from '@/lib/crypto';
import { signAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth';
import { createSession } from '@/lib/capital';

import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, fullName, apiKey, apiPassword, accountType } = body;
        const password = body.password || apiPassword; // Item H1 Fix: Split application password from broker password
        
        if (!body.password) {
            console.warn(`[Register] User ${email} registered without separate app password. Falling back to broker password.`);
        }

        const isDemo = accountType === 'demo';

        if (!email || !apiKey || !apiPassword) {
            return NextResponse.json({ message: 'Missing required credentials' }, { status: 400 });
        }

        // 1. Institutional Validation: Attempt to create a session before recording in DB
        try {
            await createSession(email, apiPassword, apiKey, isDemo);
        } catch (err: any) {
            console.error(`[Register] Capital.com Validation Failure:`, err.message);
            return NextResponse.json({ message: `Brokerage validation failed: ${err.message}` }, { status: 401 });
        }

        // 2. Identity Sync via stable SDK
        const { data: existingUsers } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .limit(1);
            
        const existingUser = existingUsers?.[0];

        const passwordHash = await hashPassword(password);
        let user;

        if (existingUser) {
            const { data: updatedUser } = await supabase
                .from('users')
                .update({
                    password_hash: passwordHash,
                    full_name: fullName || 'Trading User',
                    updated_at: new Date()
                })
                .eq('id', existingUser.id)
                .select('*')
                .limit(1);
            user = updatedUser?.[0];
        } else {
            const { data: newUser } = await supabase
                .from('users')
                .insert({
                    email: email.toLowerCase(),
                    password_hash: passwordHash,
                    full_name: fullName || 'Trading User',
                    role: 'user'
                })
                .select('*')
                .limit(1);
            user = newUser?.[0];
        }

        if (!user) throw new Error("Identity Persistence Failure");

        // 3. Credentials Encryption & account linking via stable SDK
        const { hashApiKey } = await import('@/lib/crypto');
        const keyHash = hashApiKey(apiKey);
        const encryptedKey = encrypt(apiKey);
        const encryptedPass = encrypt(apiPassword);

        const { data: existingAccounts } = await supabase
            .from('capital_accounts')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
        
        const existingAccount = existingAccounts?.[0];

        if (existingAccount) {
            await supabase
                .from('capital_accounts')
                .update({
                    encrypted_api_key: encryptedKey,
                    encrypted_api_password: encryptedPass,
                    api_key_hash: keyHash,
                    capital_account_id: email.toLowerCase(),
                    is_active: true,
                    account_type: accountType || 'demo',
                    updated_at: new Date()
                })
                .eq('id', existingAccount.id);
        } else {
            await supabase
                .from('capital_accounts')
                .insert({
                    user_id: user.id,
                    encrypted_api_key: encryptedKey,
                    encrypted_api_password: encryptedPass,
                    api_key_hash: keyHash,
                    capital_account_id: email.toLowerCase(),
                    is_active: true,
                    account_type: accountType || 'demo'
                });
        }

        // 4. Session & Cleanup
        const accessToken = await signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
            tokenVersion: user.token_version || 0,
        });

        const refreshToken = generateRefreshToken();

        await supabase.from('refresh_tokens').insert({
            user_id: user.id,
            token_hash: refreshToken,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        });

        await setAuthCookies(accessToken, refreshToken);

        return NextResponse.json({
            message: 'Registration successful',
            user: { id: user.id, email: user.email, name: user.full_name }
        });

    } catch (error: any) {
        console.error('Registration Bridge Failure:', error.message);
        return NextResponse.json({ message: 'Security Bridge Offline' }, { status: 500 });
    }
}
