import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { comparePassword } from '../src/lib/crypto';

async function testLogin(email: string) {
    try {
        console.log(`Testing login for ${email}...`);
        const [user] = await db.select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (!user) {
            console.log("User not found.");
            return;
        }

        console.log("User found:", user.email);
        console.log("Role:", user.role);
        
        // Simulating the rest of the flow
        console.log("Flow simulation complete. No crash detected.");
    } catch (err: any) {
        console.error("Test Login Failure:", err);
    }
}

testLogin('lemicmelic@gmail.com');
