import { pool } from '../src/lib/db/index';

async function debug() {
    try {
        console.log("--- Users ---");
        const users = await pool.query(`SELECT id, email, role FROM users LIMIT 10`);
        console.log(users.rows);

        console.log("\n--- Campaigns ---");
        const campaigns = await pool.query(`SELECT id, name FROM campaigns LIMIT 5`);
        console.log(campaigns.rows);

        console.log("\n--- Assignments ---");
        const assignments = await pool.query(`SELECT * FROM campaign_assignments LIMIT 5`);
        console.log(assignments.rows);

        if (assignments.rows.length > 0) {
            const staffId = assignments.rows[0].staff_id;
            console.log(`\n--- Testing query for staff_id: ${staffId} ---`);
            const query = `
                SELECT 
                    ca.id,
                    ca.unique_code,
                    ca.custom_alias,
                    ca.short_url,
                    ca.status,
                    c.id as campaign_id,
                    c.name as campaign_name,
                    c.description as campaign_description,
                    c.landing_page_url as landing_page,
                    c.resources,
                    COUNT(an.id) FILTER (WHERE an.event_type = 'CLICK') as clicks,
                    COUNT(an.id) FILTER (WHERE an.event_type = 'LEAD') as leads,
                    COUNT(an.id) FILTER (WHERE an.event_type = 'CONVERSION') as conversions
                FROM campaign_assignments ca
                INNER JOIN campaigns c ON ca.campaign_id = c.id
                LEFT JOIN campaign_analytics an ON an.assignment_id = ca.id
                WHERE ca.staff_id = $1
                GROUP BY ca.id, c.id, ca.custom_alias
            `;
            const result = await pool.query(query, [staffId]);
            console.log(`Result count: ${result.rows.length}`);
            console.log(result.rows);
        } else {
            console.log("\nNo assignments found in the database!");
        }

    } catch (e: any) {
        console.error("Debug failed:", e.message);
    } finally {
        await pool.end();
    }
}

debug();
