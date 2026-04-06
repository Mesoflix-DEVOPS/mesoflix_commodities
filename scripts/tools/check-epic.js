
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    const userId = 'abac82fa-165e-4b57-9a6e-c903967a16d5';
    try {
        const trades = await sql`
            SELECT id, engine_id, epic, open_price 
            FROM automation_trades 
            WHERE user_id = ${userId} 
            AND (open_price LIKE '5151%' OR open_price LIKE '5156%')
        `;
        trades.forEach(t => {
            console.log(`Engine: ${t.engine_id} | Epic: ${t.epic} | Price: ${t.open_price}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
