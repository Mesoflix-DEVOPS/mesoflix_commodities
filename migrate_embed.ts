import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log("Connecting directly to secure registry...");
        await client.connect();
        console.log("Initializing Protocol: Schema Expansion...");
        await client.query("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS embed_code TEXT;");
        console.log("Success: embed_code column integrated into campaigns registry.");
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error("Migration Failure:", err);
        process.exit(1);
    }
}

migrate();
