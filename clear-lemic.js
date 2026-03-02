
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function clear() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`DELETE FROM automation_trades WHERE user_id = '2d092e8a-f24a-4878-a058-ac1e80e554c9'`;
        console.log('CLEARED TRADES:', res.length);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
clear();
