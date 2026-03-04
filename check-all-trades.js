
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const trades = await sql`
            SELECT user_id, engine_id, epic, open_price, created_at 
            FROM automation_trades 
            WHERE open_price LIKE '5151%' OR open_price LIKE '5156%'
        `;
        console.log('--- MATCHING TRADES ACROSS ALL USERS ---');
        console.log(JSON.stringify(trades, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
