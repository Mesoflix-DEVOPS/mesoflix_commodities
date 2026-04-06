import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ CRITICAL: Supabase URL or Service Role Key missing in environment.');
    }
}

// Institutional-grade Admin Client for Next.js (HTTPS/Port 443)
// This client is used in API routes to bypass all networking restrictions.
export const supabase = createClient(
    supabaseUrl || '',
    supabaseServiceKey || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
