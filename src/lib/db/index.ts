import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

// Institutional-grade Self-Healing Logic: 
// Automatically patch the connection string for Vercel + Supabase production scaling.
let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('supabase.co:5432')) {
    console.info('[DB Patch] Upgrading to high-performance Port 6543 for Supabase Pooling');
    connectionString = connectionString.replace(':5432', ':6543');
    
    // Ensure mandatory SSL and Pooling parameters are present
    if (!connectionString.includes('sslmode=')) {
        connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    if (!connectionString.includes('pgbouncer=')) {
        connectionString += (connectionString.includes('?') ? '&' : '?') + 'pgbouncer=true';
    }
}

const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
    ssl: {
        rejectUnauthorized: false
    }
});

export const db = drizzle(pool, { schema });

/**
 * Helper to retry database operations on transient connection failures
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const msg = err.message?.toLowerCase() || '';
            const isTransient = msg.includes('timeout') ||
                msg.includes('fetch failed') ||
                msg.includes('connection') ||
                msg.includes('undici');

            if (isTransient && i < retries - 1) {
                console.warn(`[DB Retry] attempt ${i + 1} failed, retrying in ${delay * Math.pow(2, i)}ms...`);
                await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}
