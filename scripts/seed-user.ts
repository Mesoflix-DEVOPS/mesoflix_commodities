
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, timestamp, boolean, uuid, integer } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// ---- DB Schema ----
const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').unique().notNull(),
    password_hash: text('password_hash').notNull(),
    full_name: text('full_name'),
    role: text('role').default('user'),
    email_verified: boolean('email_verified').default(false),
    token_version: integer('token_version').default(0),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
    last_login_at: timestamp('last_login_at'),
});

// ---- Crypto Utils ----
async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

// ---- Main ----
async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is not defined");
        process.exit(1);
    }

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    const args = process.argv.slice(2);
    if (args.length !== 2) {
        console.error("Usage: npx tsx scripts/seed-user.ts <email> <password>");
        process.exit(1);
    }

    const [email, password] = args;

    console.log(`Seeding User: ${email}`);

    try {
        const passwordHash = await hashPassword(password);

        // Check if exists
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existing) {
            await db.update(users).set({
                password_hash: passwordHash,
                updated_at: new Date(),
            }).where(eq(users.id, existing.id));
            console.log("Updated existing user password.");
        } else {
            await db.insert(users).values({
                email,
                password_hash: passwordHash,
                full_name: 'Admin User',
                role: 'admin',
                email_verified: true,
            });
            console.log("Created new user.");
        }

        console.log("Done.");
        process.exit(0);

    } catch (error) {
        console.error("Error seeding user:", error);
        process.exit(1);
    }
}

main();
