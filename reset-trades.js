
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function reset() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`UPDATE automation_trades SET status = 'Closed' WHERE status IS NULL OR status = 'Open'`;
        console.log('RESET TRADES:', res.length);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
reset();
