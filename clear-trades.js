
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function clear() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`DELETE FROM automation_trades WHERE user_id = 'c13028fb-673c-443b-8519-940375a037df'`; // Lemic's ID from subagent context or known
        console.log('CLEARED TRADES:', res.length);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
clear();
