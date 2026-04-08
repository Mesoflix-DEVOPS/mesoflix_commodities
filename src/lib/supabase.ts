import { createClient } from '@supabase/supabase-js';

// Environment variables are required for runtime but can be missing during Next.js static analysis/build steps.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error("FATAL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in production environment.");
    } else {
        console.warn('⚠️ WARNING: Supabase configurations missing. Using build-time placeholders.');
    }
}

/**
 * Institutional-grade Admin Client for Next.js (HTTPS/Port 443)
 * This client is used in API routes to bypass all networking restrictions.
 * It is safeguarded with placeholder values to prevent build-time crashes.
 */
export const supabase = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
