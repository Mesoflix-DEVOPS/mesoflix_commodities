import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

// Institutional-grade Neon Serverless Pool:
// Using the official Neon driver to prevent connection drops.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
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
