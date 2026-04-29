import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function forensic() {
    const columns = [
        "id", "email", "password_hash", "full_name", "role", 
        "email_verified", "token_version", "created_at", 
        "updated_at", "last_login_at", "two_factor_enabled", 
        "two_factor_secret"
    ];

    console.log("Starting column forensics...");

    for (const col of columns) {
        try {
            await db.execute(sql.raw(`SELECT ${col} FROM users LIMIT 1`));
            console.log(`[OK] Column '${col}' exists.`);
        } catch (err: any) {
            console.error(`[FAIL] Column '${col}' is MISSING or INVALID:`, err.message);
        }
    }
}

forensic();
