
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`SELECT id, engine_id, status, open_price, pnl, last_sync_at FROM automation_trades WHERE status = 'Open' LIMIT 25`;
        console.log('ACTIVE TRADES:', JSON.stringify(res, null, 2));
    } catch (err) {
        console.error(err);
    }
}
check();
