import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function testRegister(email: string) {
    try {
        console.log(`Testing registration for ${email}...`);
        
        // 1. Check existing
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        console.log("Existing user status:", !!existing);

        // 2. Try insert/update simulation
        if (existing) {
             const [updated] = await db.update(users)
                .set({ full_name: 'Test Admin', updated_at: new Date() })
                .where(eq(users.id, existing.id))
                .returning();
             console.log("Update success:", updated.id);
        } else {
            const [inserted] = await db.insert(users)
                .values({
                    email: email,
                    full_name: 'Test Admin',
                    role: 'admin',
                    password_hash: 'dummy_hash'
                })
                .returning();
            console.log("Insert success:", inserted.id);
        }

        console.log("Registration simulation complete.");
    } catch (err: any) {
        console.error("Test Register Failure:", err);
    }
}

testRegister('test-admin-' + Date.now() + '@mesoflix.com');
