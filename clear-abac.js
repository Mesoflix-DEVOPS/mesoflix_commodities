
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function clear() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`DELETE FROM automation_trades WHERE user_id = 'abac82fa-4b57-9a6e-c903967a16d5'`;
        console.log('CLEARED TRADES:', res.length);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
clear();
