
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`SELECT id, open_price, direction, created_at, pnl FROM automation_trades WHERE status = 'Open'`;
        console.log('NEW TRADES:', JSON.stringify(res, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
