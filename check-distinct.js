
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const epics = await sql`SELECT DISTINCT epic FROM automation_trades`;
        console.log('--- DISTINCT EPICS ---');
        console.log(JSON.stringify(epics, null, 2));

        const engines = await sql`SELECT DISTINCT engine_id FROM automation_trades`;
        console.log('\n--- DISTINCT ENGINES ---');
        console.log(JSON.stringify(engines, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
