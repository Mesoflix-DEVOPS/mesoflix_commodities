import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

// Institutional-grade Postgres connection pool for high-concurrency trading
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
