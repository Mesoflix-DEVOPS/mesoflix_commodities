import { db } from '../src/lib/db';
import { campaignAnalytics, campaignAssignments, campaigns, users } from '../src/lib/db/schema';
import { count, eq, sql } from 'drizzle-orm';

async function testAnalytics() {
    try {
        console.log("Checking Campaign Tables...");
        
        const analyticsCount = await db.select({ value: count() }).from(campaignAnalytics);
        console.log("Analytics Rows:", analyticsCount[0].value);

        const assignmentCount = await db.select({ value: count() }).from(campaignAssignments);
        console.log("Assignment Rows:", assignmentCount[0].value);

        const campaignCount = await db.select({ value: count() }).from(campaigns);
        console.log("Campaign Rows:", campaignCount[0].value);

        console.log("All tables are reachable.");
    } catch (err: any) {
        console.error("DEBUG ERROR:", err.message);
        if (err.message.includes('does not exist')) {
            console.error("TABLE MISSING. Need to run migration.");
        }
    } finally {
        process.exit();
    }
}

testAnalytics();
