
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function find() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const res = await sql`SELECT id, email FROM users WHERE email ILIKE 'lemicmelic@gmail.com'`;
        console.log('USER:', JSON.stringify(res, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
find();
