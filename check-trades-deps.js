
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    const userId = 'abac82fa-165e-4b57-9a6e-c903967a16d5';
    try {
        const trades = await sql`
            SELECT id, deployment_id, engine_id, epic, open_price, created_at 
            FROM automation_trades 
            WHERE user_id = ${userId} 
            AND (open_price LIKE '5151%' OR open_price LIKE '5156%')
        `;
        trades.forEach(t => {
            console.log(`TradeID: ${t.id} | DepID: ${t.deployment_id} | Engine: ${t.engine_id} | Price: ${t.open_price}`);
        });

        const depIds = [...new Set(trades.map(t => t.deployment_id))];
        console.log('\n--- DEPLOYMENT DETAILS ---');
        for (const id of depIds) {
            const dep = await sql`SELECT * FROM automation_deployments WHERE id = ${id}`;
            console.log(JSON.stringify(dep, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
