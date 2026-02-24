import { db } from './src/lib/db';
import { capitalAccounts, users } from './src/lib/db/schema';

async function debug() {
    try {
        console.log("--- DEBUG: Fetching Capital Accounts ---");
        const accounts = await db.select().from(capitalAccounts);
        console.log(`Found ${accounts.length} accounts.`);

        accounts.forEach(a => {
            console.log(`Account ID: ${a.id}`);
            console.log(`  User ID: ${a.user_id}`);
            console.log(`  Label: ${a.label}`);
            console.log(`  Is Active: ${a.is_active}`);
            console.log(`  API Key Hash: ${a.api_key_hash}`);
            console.log(`  Session Mode: ${a.session_mode}`);
            console.log(`  Selected ID: ${a.selected_capital_account_id}`);
            console.log("-----------------------------------------");
        });

        const usersList = await db.select().from(users);
        console.log(`Found ${usersList.length} users.`);
        usersList.forEach(u => {
            console.log(`User ID: ${u.id}, Email: ${u.email}`);
        });

    } catch (err) {
        console.error("DEBUG ERROR:", err);
    }
    process.exit(0);
}

debug();
