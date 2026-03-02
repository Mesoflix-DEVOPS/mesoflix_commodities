
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`SELECT count(*) FROM automation_trades WHERE user_id = 'abac82fa-165e-4bb5-9a6e-c903967a16d5'`;
        console.log('FINAL COUNT:', res[0].count);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
