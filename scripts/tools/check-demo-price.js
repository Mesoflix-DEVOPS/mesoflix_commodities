
const { getValidSession } = require('./src/lib/capital-service');
const { getMarketTickers } = require('./src/lib/capital');
require('dotenv').config();

async function check() {
    const userId = 'abac82fa-165e-4b57-9a6e-c903967a16d5';
    try {
        console.log('Fetching GOLD price in DEMO mode...');
        const session = await getValidSession(userId, true); // true = demo
        const tickers = await getMarketTickers(session.cst, session.xSecurityToken, ['GOLD'], true);

        console.log('--- GOLD TICKER (DEMO) ---');
        console.log(JSON.stringify(tickers, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
