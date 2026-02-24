import { getValidSession } from './src/lib/capital-service';
import { getAccounts } from './src/lib/capital';
import { db } from './src/lib/db';
import { users } from './src/lib/db/schema';

async function simulate() {
    const allUsers = await db.select().from(users).limit(1);
    if (allUsers.length === 0) {
        console.error("No users found in database.");
        process.exit(1);
    }
    const userId = allUsers[0].id;
    const mode = "demo";
    const isDemo = mode === "demo";

    try {
        console.log(`Simulating for userId=${userId}, mode=${mode}...`);

        // 1. Session
        const session = await getValidSession(userId, isDemo);
        console.log("Session obtained:", {
            cst: session.cst.substring(0, 5) + "...",
            xst: session.xSecurityToken.substring(0, 5) + "...",
            isDemo: session.accountIsDemo
        });

        // 2. Fetch Accounts
        const data = await getAccounts(session.cst, session.xSecurityToken, session.accountIsDemo ?? isDemo);
        console.log("Accounts fetched successfully.");
        console.log("Found", data.accounts?.length, "accounts.");

    } catch (err: any) {
        console.error("SIMULATION FAILED!");
        console.error("Error Message:", err.message);
        console.error("Stack Trace:", err.stack);
    }
    process.exit(0);
}

simulate();
