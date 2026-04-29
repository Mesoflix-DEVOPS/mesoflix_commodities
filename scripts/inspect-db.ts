import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function inspect() {
    try {
        console.log("Inspecting columns of 'users' table...");
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.log("Columns found in 'users':", result.rows);
    } catch (err: any) {
        console.error("Inspection Failure:", err);
    }
}

inspect();
