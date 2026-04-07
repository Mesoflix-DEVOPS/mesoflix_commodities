import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL missing from .env");
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function recalibrate() {
    console.log("🚀 Starting Institutional Mode Recalibration...");
    try {
        // Correct Tagged Template syntax for Neon SDK
        await sql`UPDATE capital_accounts SET encrypted_session_tokens = NULL`;
        console.log("✅ ALL BROKERAGE SESSIONS WIPED.");
        console.log("✅ SYSTEM READY FOR FRESH HANDSHAKES.");
    } catch (err: any) {
        console.error("❌ Recalibration Failed:", err.message);
    }
}

recalibrate();
