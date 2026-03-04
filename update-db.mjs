import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function updateDb() {
    console.log('🔄 Applying missing indexes to database...');

    const queries = [
        `CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens (user_id);`,
        `CREATE INDEX IF NOT EXISTS capital_accounts_user_id_idx ON capital_accounts (user_id);`,
        `CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs (user_id);`,
        `CREATE INDEX IF NOT EXISTS engine_settings_user_id_idx ON engine_settings (user_id);`,
        `CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);`,
        `CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON tickets (user_id);`,
        `CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON ticket_messages (ticket_id);`,
        `CREATE INDEX IF NOT EXISTS platform_trades_user_id_idx ON platform_trades (user_id);`,
        `CREATE INDEX IF NOT EXISTS closed_trades_user_id_idx ON closed_trades (user_id);`,
        `CREATE INDEX IF NOT EXISTS automation_deployments_user_id_idx ON automation_deployments (user_id);`,
        `CREATE INDEX IF NOT EXISTS automation_trades_user_id_idx ON automation_trades (user_id);`
    ];

    for (const query of queries) {
        try {
            console.log(`Executing: ${query}`);
            await db.execute(sql.raw(query));
            console.log('✅ Success');
        } catch (error) {
            console.error(`❌ Failed: ${query}`, error.message);
        }
    }

    console.log('🏁 Database optimization complete.');
}

updateDb();
