import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

// Use same config as index.ts for local relative path
dotenv.config({ path: '../.env' });

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in server/db.ts');
}

// Institutional-grade Supabase Connection Patching
let connectionString = process.env.DATABASE_URL;

// Force Port 6543 (Transaction Pooler) if using Supabase
if (connectionString.includes('supabase.co')) {
    connectionString = connectionString.replace(':5432', ':6543');
    if (!connectionString.includes('sslmode=')) {
        connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
    }
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

// Startup Connection Heartbeat (The "HOPE" Log)
(async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        console.info('\x1b[32m%s\x1b[0m', '🚀 INSTITUTIONAL DATABASE CONNECTED (Render -> Supabase Stable)');
    } catch (err: any) {
        console.error('\x1b[31m%s\x1b[0m', '❌ DATABASE CONNECTION FAILED:', err.message);
        console.info('HINT: Check if DATABASE_URL in Render has exactly :6543 and sslmode=require');
    }
})();
