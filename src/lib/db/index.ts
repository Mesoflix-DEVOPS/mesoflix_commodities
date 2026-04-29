import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const NEON_URL = "postgresql://neondb_owner:npg_ZPx1CpzRNL9V@ep-super-haze-aijr7mty-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";
const DATABASE_URL = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('supabase.co') 
    ? process.env.DATABASE_URL 
    : NEON_URL;

// Institutional-grade Connection Pool:
// Exported for native driver-level failsafe queries.
export const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
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
            console.warn(`[DB Retry] attempt ${i + 1} failed, retrying...`);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}
