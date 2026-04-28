import { db } from '../src/lib/db';
import { campaigns, campaignAssignments, users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function diagnose() {
    try {
        console.log("--- Campaign Diagnostic ---");
        const allCampaigns = await db.select().from(campaigns);
        console.log(`Campaigns Count: ${allCampaigns.length}`);

        const allAssignments = await db.select().from(campaignAssignments);
        console.log(`Assignments Count: ${allAssignments.length}`);

        const staffCandidates = await db.select().from(users).limit(10);
        console.log("Recent Users:", staffCandidates.map(u => ({ id: u.id, email: u.email, role: u.role })));

    } catch (err: any) {
        console.error("Database Diagnostic Failure:", err.message);
    }
}

diagnose();
