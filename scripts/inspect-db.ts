import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function inspect() {
    try {
        console.log("Inspecting tables...");
        const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        console.log("Tables found:", result.rows);
    } catch (err: any) {
        console.error("Inspection Failure:", err);
    }
}

inspect();
