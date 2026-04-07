const pg = require('pg');
require('dotenv').config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    console.log("🚀 Initializing Global Session Recalibration...");
    await client.connect();
    console.log("📡 Connected to Neon Database.");
    
    // Hard Wipe: This clears the corrupted session cache.
    // The next time the heartbeat runs, it will re-identify Demo vs Real correctly.
    const res = await client.query('UPDATE capital_accounts SET encrypted_session_tokens = NULL');
    console.log(`✅ Success! ${res.rowCount} brokerage sessions have been cleared.`);
    console.log("💡 The platform will now perform fresh, verified handshakes.");
    
    await client.end();
  } catch (err) {
    console.error("❌ Recalibration Failed:", err.message);
    process.exit(1);
  }
}

run();
