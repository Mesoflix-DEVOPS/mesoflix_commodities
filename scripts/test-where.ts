import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function testWhere() {
    try {
        const email = 'mesoflixltd@gmail.com';
        console.log(`Testing WHERE clause for ${email}...`);
        
        // Try with template literal (Drizzle way)
        try {
             const res1 = await db.execute(sql`SELECT id, email FROM users WHERE email = ${email} LIMIT 1`);
             console.log("Template literal query successful:", res1.rows);
        } catch (e: any) {
             console.error("Template literal query failed:", e.message);
        }

        // Try with raw string
        try {
             const res2 = await db.execute(sql.raw(`SELECT id, email FROM users WHERE email = '${email}' LIMIT 1`));
             console.log("Raw string query successful:", res2.rows);
        } catch (e: any) {
             console.error("Raw string query failed:", e.message);
        }

    } catch (err: any) {
        console.error("Outer Failure:", err);
    }
}

testWhere();
