import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';

async function listUsers() {
    try {
        console.log("Listing users...");
        const allUsers = await db.select().from(users);
        console.log("Users:", allUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
    } catch (err: any) {
        console.error("User List Failure:", err.message);
    }
}

listUsers();
