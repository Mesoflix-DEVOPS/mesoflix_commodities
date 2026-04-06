import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

// Use same config as index.ts for local relative path
dotenv.config({ path: '../.env' });

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in server/db.ts');
}

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in server/db.ts');
}

// Institutional-grade Self-Healing Logic: 
// Automatically patch the connection string for Render + Supabase production scaling.
let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('supabase.co:5432')) {
    console.info('[DB Patch] Backend upgrading to high-performance Port 6543');
    connectionString = connectionString.replace(':5432', ':6543');
    
    // Ensure mandatory SSL and Pooling parameters are present
    if (!connectionString.includes('sslmode=')) {
        connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    if (!connectionString.includes('pgbouncer=')) {
        connectionString += (connectionString.includes('?') ? '&' : '?') + 'pgbouncer=true';
    }
}

// Independent Postgres pool for the standalone server
const pool = new Pool({
    connectionString,
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
        rejectUnauthorized: false
    }
});

export const db = drizzle(pool, { schema });
