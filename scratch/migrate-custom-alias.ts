import { pool } from '../src/lib/db/index';

async function migrate() {
    try {
        console.log("Adding custom_alias column to campaign_assignments...");
        await pool.query(`
            ALTER TABLE campaign_assignments 
            ADD COLUMN IF NOT EXISTS custom_alias TEXT UNIQUE;
        `);
        console.log("Migration successful!");
    } catch (e: any) {
        console.error("Migration failed:", e.message);
    } finally {
        await pool.end();
    }
}

migrate();
