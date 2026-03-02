import { db } from './src/lib/db';
import { users, capitalAccounts, automationDeployments } from './src/lib/db/schema';

async function diagnose() {
    try {
        console.log("--- DIagnostic Check ---");
        const allUsers = await db.select().from(users).limit(5);
        console.log("Users sample:", allUsers.map(u => ({ id: u.id, email: u.email })));

        const allCapAccs = await db.select().from(capitalAccounts);
        console.log("Capital Accounts Count:", allCapAccs.length);

        const allDeps = await db.select().from(automationDeployments);
        console.log("Deployments Count:", allDeps.length);

        process.exit(0);
    } catch (e) {
        console.error("DIAGNOSTIC FAILED:", e);
        process.exit(1);
    }
}

diagnose();
