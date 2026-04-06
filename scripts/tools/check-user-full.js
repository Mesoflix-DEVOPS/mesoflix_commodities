
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    const userId = 'abac82fa-165e-4b57-9a6e-c903967a16d5';
    try {
        const deployments = await sql`
            SELECT id, engine_id, commodity, status, mode 
            FROM automation_deployments 
            WHERE user_id = ${userId}
        `;
        console.log('--- ALL DEPLOYMENTS ---');
        deployments.forEach(d => {
            console.log(`ID: ${d.id} | Engine: ${d.engine_id} | Commodity: ${d.commodity} | Status: ${d.status} | Mode: ${d.mode}`);
        });

        const recentTrades = await sql`
            SELECT id, engine_id, epic, open_price, created_at 
            FROM automation_trades 
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
            LIMIT 10
        `;
        console.log('\n--- RECENT TRADES ---');
        recentTrades.forEach(t => {
            console.log(`Engine: ${t.engine_id} | Epic: ${t.epic} | Price: ${t.open_price} | Date: ${t.created_at}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
