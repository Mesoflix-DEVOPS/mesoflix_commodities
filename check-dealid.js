
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    const userId = 'abac82fa-165e-4b57-9a6e-c903967a16d5';
    try {
        const trades = await sql`
            SELECT deal_id, open_price, created_at 
            FROM automation_trades 
            WHERE user_id = ${userId} 
            AND (open_price LIKE '5151%' OR open_price LIKE '5156%')
        `;
        trades.forEach(t => {
            console.log(`DealID: ${t.deal_id} | Price: ${t.open_price} | Date: ${t.created_at}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
