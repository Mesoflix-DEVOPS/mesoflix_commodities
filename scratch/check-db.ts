import { pool } from '../src/lib/db/index';

async function test() {
    try {
        console.log("Checking columns of campaign_assignments...");
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'campaign_assignments'
        `);
        console.log("Columns:", res.rows);

        console.log("Testing staff campaigns query...");
        const userId = 'some-dummy-id'; // just testing syntax
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
        
        // This will fail if syntax/columns are bad, even with dummy ID (except for no rows, but syntax error is what we want to catch)
        await pool.query(query, ['00000000-0000-0000-0000-000000000000']);
        console.log("Query syntax OK!");
    } catch (e: any) {
        console.error("Error details:", e.message);
    } finally {
        await pool.end();
    }
}

test();
