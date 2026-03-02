
import { db } from './src/lib/db';
import { automationDeployments } from './src/lib/db/schema';

async function main() {
    try {
        const deps = await db.select().from(automationDeployments);
        console.log('DEPLOYMENTS:', JSON.stringify(deps, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
