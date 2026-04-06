import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

// Use same config as index.ts for local relative path
dotenv.config({ path: '../.env' });

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in server/db.ts');
}

// Independent Postgres pool for the standalone server
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
});

export const db = drizzle(pool, { schema });
