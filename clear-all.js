
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function clearAll() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`DELETE FROM automation_trades`;
        console.log('CLEARED ALL:', res.length);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
clearAll();
