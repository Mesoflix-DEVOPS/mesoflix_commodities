import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function listUsers() {
    try {
        console.log("Listing users...");
        const result = await db.execute(sql`SELECT id, email, role FROM users`);
        console.log("Users:", result.rows);
    } catch (err: any) {
        console.error("User List Failure:", err);
    }
}

listUsers();
