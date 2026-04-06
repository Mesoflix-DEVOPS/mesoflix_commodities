
import { getValidSession } from './src/lib/capital-service';
import { getMarketTickers } from './src/lib/capital';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const userId = 'abac82fa-165e-4b57-9a6e-c903967a16d5';
    try {
        console.log('Fetching GOLD price in DEMO mode...');
        const session = await getValidSession(userId, true);
        console.log('Using Account ID:', session.activeAccountId);

        const tickers = await getMarketTickers(session.cst, session.xSecurityToken, ['GOLD'], true);
        console.log('--- GOLD TICKER (DEMO) ---');
        console.log(JSON.stringify(tickers, null, 2));

        const prices = await fetch(`https://demo-api-capital.backend-capital.com/api/v1/prices/GOLD?resolution=MINUTE_5&max=5`, {
            headers: { 'CST': session.cst, 'X-SECURITY-TOKEN': session.xSecurityToken }
        });
        const priceData = await prices.json();
        console.log('\n--- RECENT PRICES (DEMO) ---');
        console.log(JSON.stringify(priceData, null, 2));

        process.exit(0);
    } catch (err: any) {
        console.error(err);
        process.exit(1);
    }
}
check();
