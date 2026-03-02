
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`SELECT DISTINCT user_id FROM automation_trades`;
        console.log('IDS:', res.map(r => r.user_id));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
