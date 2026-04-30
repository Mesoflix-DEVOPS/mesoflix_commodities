import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log("Connecting to Institutional Registry...");
        await client.connect();
        console.log("Initializing Protocol: Vanity Link Integration...");
        
        // Add custom_alias column to assignments
        await client.query("ALTER TABLE campaign_assignments ADD COLUMN IF NOT EXISTS custom_alias TEXT UNIQUE;");
        
        console.log("Success: Vanity Link Registry initialized.");
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error("Migration Failure:", err);
        process.exit(1);
    }
}

migrate();
