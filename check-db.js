
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`SELECT id, engine_id, status, mode, last_decision_reason FROM automation_deployments`;
        console.log('DEPLOYMENTS:', JSON.stringify(res, null, 2));
    } catch (err) {
        console.error(err);
    }
}
check();
