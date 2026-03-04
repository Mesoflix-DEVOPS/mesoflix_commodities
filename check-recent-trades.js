
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const trades = await sql`
            SELECT id, user_id, engine_id, epic, open_price, status, created_at 
            FROM automation_trades 
            ORDER BY created_at DESC
            LIMIT 50
        `;
        console.log('--- RECENT TRADES ---');
        trades.forEach(t => {
            console.log(`User: ${t.user_id.substring(0, 8)} | Engine: ${t.engine_id} | Epic: ${t.epic} | Price: ${t.open_price} | Date: ${t.created_at}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
