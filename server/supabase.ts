import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Same config as index.ts
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ CRITICAL: Supabase URL or Service Role Key missing in environment.');
}

// Institutional-grade Admin Client (HTTPS/Port 443)
// This client uses standard web traffic to bypass all TCP port restrictions.
export const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Startup Handshake (Verification Log)
(async () => {
    try {
        const { data, error } = await supabase.from('users').select('id').limit(1);
        if (error) throw error;
        console.info('\x1b[32m%s\x1b[0m', '🚀 SUPABASE SDK CONNECTED (Port 443 Stable)');
    } catch (err: any) {
        console.error('\x1b[31m%s\x1b[0m', '❌ SUPABASE SDK OFFLINE:', err.message);
    }
})();
