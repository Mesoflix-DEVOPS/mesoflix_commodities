
const { getValidSession } = require('./src/lib/capital-service');
const { getHistory } = require('./src/lib/capital');
require('dotenv').config();

async function check() {
    const userId = 'abac82fa-165e-4b57-9a6e-c903967a16d5';
    try {
        console.log('Fetching history for LIVE mode...');
        const session = await getValidSession(userId, false); // false = real/live
        const history = await getHistory(session.cst, session.xSecurityToken, false, { max: 20 });

        console.log('--- CAPITAL.COM HISTORY ---');
        console.log(JSON.stringify(history, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
