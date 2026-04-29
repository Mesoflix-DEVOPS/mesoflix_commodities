import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function promote(email: string) {
    try {
        console.log(`Promoting ${email} to admin...`);
        const result = await db.update(users)
            .set({ role: 'admin' })
            .where(eq(users.email, email))
            .returning();
        
        if (result.length > 0) {
            console.log("Success! User promoted:", result[0].email);
        } else {
            console.log("User not found.");
        }
    } catch (err: any) {
        console.error("Promotion Failure:", err.message);
    }
}

const targetEmail = process.argv[2];
if (!targetEmail) {
    console.log("Please provide an email as an argument.");
} else {
    promote(targetEmail);
}
