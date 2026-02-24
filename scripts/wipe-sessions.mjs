// One-shot script to wipe stale Capital.com session tokens from the DB.
// Run: node scripts/wipe-sessions.mjs
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL env var not set');

const sql = neon(DATABASE_URL);

const result = await sql`
    UPDATE capital_accounts
    SET 
        encrypted_session_tokens = NULL,
        session_updated_at = NULL,
        session_mode = NULL
    WHERE encrypted_session_tokens IS NOT NULL
    RETURNING id, label, is_active
`;

console.log(`✅ Wiped ${result.length} stale session(s):`);
for (const row of result) {
    console.log(`   - ${row.label || 'unnamed'} (active=${row.is_active})`);
}
console.log('Done. All next requests will create fresh sessions on the correct server.');
