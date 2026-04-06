
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const settings = await sql`SELECT * FROM system_settings`;
        settings.forEach(s => {
            console.log(`Key: ${s.key} | Value: ${s.value}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
