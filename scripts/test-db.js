const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
    console.log("Testing Neon DB Connection...");
    try {
        const result = await sql`SELECT 1 as val`;
        console.log("Connection successful!");
        console.log("Query result:", result);
    } catch (error) {
        console.error("Connection failed:", error);
    }
}

main();
