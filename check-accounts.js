
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const accounts = await sql`SELECT id, user_id, label, is_active, encrypted_api_key, encrypted_api_password FROM capital_accounts`;
        accounts.forEach(a => {
            console.log(`ID: ${a.id} | User: ${a.user_id.substring(0, 8)} | Label: ${a.label} | Active: ${a.is_active} | HasPass: ${!!a.encrypted_api_password}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
