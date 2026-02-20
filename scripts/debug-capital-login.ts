
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// ---- DB Schema (Partial) ----
const systemSettings = pgTable('system_settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
});

// ---- Crypto Utils ----
if (!process.env.CAPITAL_ENCRYPTION_KEY || process.env.CAPITAL_ENCRYPTION_KEY.length < 32) {
    console.warn("WARNING: CAPITAL_ENCRYPTION_KEY is missing or too short. Using a default unsafe key for dev.");
}
const RAW_KEY = process.env.CAPITAL_ENCRYPTION_KEY || 'default-unsafe-key';
const ENCRYPTION_KEY = crypto.scryptSync(RAW_KEY, 'salt', 32);
const ALGORITHM = 'aes-256-gcm';

function decrypt(text: string): string {
    const parts = text.split(':');
    if (parts.length !== 3) {
        throw new Error("Invalid encrypted text format. Expected iv:tag:content");
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// ---- Main ----
async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is not defined");
        process.exit(1);
    }

    const userEmail = process.argv[2];
    const userPassword = process.argv[3];

    if (!userEmail || !userPassword) {
        console.error("Usage: npx tsx scripts/debug-capital-login.ts <email> <password>");
        process.exit(1);
    }

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    console.log("1. Fetching Master Credentials...");
    const [masterSettings] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'capital_master_credentials')).limit(1);

    if (!masterSettings) {
        console.error("ERROR: Master credentials not found in DB.");
        process.exit(1);
    }

    let apiKey = "";
    try {
        console.log("2. Decrypting...");
        const decrypted = decrypt(masterSettings.value);
        const creds = JSON.parse(decrypted);
        apiKey = creds.apiKey;
        console.log("   API Key found (masked):", apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "MISSING");
    } catch (e: any) {
        console.error("ERROR: Failed to decrypt master credentials:", e.message);
        process.exit(1);
    }

    console.log("3. Attempting Capital.com Session...");
    const API_URL = 'https://api-capital.backend-capital.com/api/v1';

    try {
        const response = await fetch(`${API_URL}/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CAP-API-KEY': apiKey,
            },
            body: JSON.stringify({
                identifier: userEmail,
                password: userPassword,
                encryptedPassword: false
            }),
        });

        if (!response.ok) {
            console.error(`ERROR: Login Failed. Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Response Body:", text);
        } else {
            const data = await response.json();
            const cst = response.headers.get('CST');
            const xSecurityToken = response.headers.get('X-SECURITY-TOKEN');
            console.log("SUCCESS! Login worked.");
            console.log("CST:", cst ? "Present" : "Missing");
            console.log("X-SECURITY-TOKEN:", xSecurityToken ? "Present" : "Missing");
        }

    } catch (e: any) {
        console.error("ERROR: Request failed:", e.message);
    }
}

main();
