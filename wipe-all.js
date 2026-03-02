
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function wipe() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        await sql`TRUNCATE automation_trades CASCADE`;
        console.log('TRUNCATED SUCCESSFULLY');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
wipe();
