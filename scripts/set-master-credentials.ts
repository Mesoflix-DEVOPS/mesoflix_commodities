
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// ---- Crypto Utils ----
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// Validate Encryption Key
if (!process.env.CAPITAL_ENCRYPTION_KEY || process.env.CAPITAL_ENCRYPTION_KEY.length < 32) {
    console.warn("WARNING: CAPITAL_ENCRYPTION_KEY is missing or too short. Using a default unsafe key for dev.");
}
const RAW_KEY = process.env.CAPITAL_ENCRYPTION_KEY || 'default-unsafe-key';
const ENCRYPTION_KEY = crypto.scryptSync(RAW_KEY, 'salt', 32);

function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

// ---- DB Schema ----
const systemSettings = pgTable('system_settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// ---- Main ----
async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is not defined");
        process.exit(1);
    }

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    const args = process.argv.slice(2);
    if (args.length !== 3) {
        console.error("Usage: npx tsx scripts/set-master-credentials.ts <login> <password> <apiKey>");
        process.exit(1);
    }

    const [login, password, apiKey] = args;

    console.log(`Configuring Master Credentials for User: ${login}`);

    try {
        const credentials = JSON.stringify({ login, password, apiKey });
        const encryptedValue = encrypt(credentials);

        // Check if exists
        const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'capital_master_credentials')).limit(1);

        if (existing) {
            await db.update(systemSettings).set({
                value: encryptedValue,
                updated_at: new Date(),
            }).where(eq(systemSettings.key, 'capital_master_credentials'));
            console.log("Updated existing master credentials.");
        } else {
            await db.insert(systemSettings).values({
                key: 'capital_master_credentials',
                value: encryptedValue,
            });
            console.log("Inserted new master credentials.");
        }

        console.log("Done.");
        process.exit(0);

    } catch (error) {
        console.error("Error setting master credentials:", error);
        process.exit(1);
    }
}

main();
