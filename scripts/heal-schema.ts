import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function heal() {
    try {
        console.log("Healing 'users' table schema...");
        
        const commands = [
            sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user'`,
            sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false`,
            sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer DEFAULT 0`,
            sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp`,
            sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false`,
            sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret text`
        ];

        for (const cmd of commands) {
            try {
                await db.execute(cmd);
                console.log(`Executed: ${cmd.queryChunks[0]}`);
            } catch (innerErr: any) {
                console.warn(`Command failed (likely already exists): ${innerErr.message}`);
            }
        }

        console.log("Schema healing complete.");
    } catch (err: any) {
        console.error("Heal Failure:", err);
    }
}

heal();
