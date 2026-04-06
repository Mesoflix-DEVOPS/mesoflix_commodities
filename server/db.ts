import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';
import { setDefaultResultOrder } from 'node:dns';

// Use same config as index.ts for local relative path
dotenv.config({ path: '../.env' });

// CRITICAL: Force IPv4 as first preference to avoid Render's IPv6 'ENETUNREACH' failures
setDefaultResultOrder('ipv4first');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in server/db.ts');
}

// THE "NORMAL WAY": Use the URL exactly as provided in Render Environment Variables
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

// Standard Startup Check
(async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        console.info('\x1b[32m%s\x1b[0m', '🚀 DATABASE CONNECTED SUCCESSFULLY');
    } catch (err: any) {
        console.error('\x1b[31m%s\x1b[0m', '❌ DATABASE CONNECTION ERROR:', err.message);
    }
})();
