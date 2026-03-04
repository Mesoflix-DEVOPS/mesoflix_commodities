
const { getValidSession } = require('./src/lib/capital-service');
require('dotenv').config();
const fetch = require('node-fetch');

async function check() {
    const userId = 'abac82fa-165e-4b57-9a6e-c903967a16d5';
    try {
        console.log('Fetching live positions for LIVE mode...');
        const session = await getValidSession(userId, false);
        const { cst, xSecurityToken: xst } = session;

        const response = await fetch('https://api-capital.backend-capital.com/api/v1/positions', {
            headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst }
        });

        const data = await response.json();
        console.log('--- LIVE POSITIONS FROM CAPITAL.COM ---');
        if (data.positions) {
            data.positions.forEach(p => {
                const pos = p.position;
                const mkt = p.market;
                console.log(`DealID: ${pos.dealId} | Instrument: ${mkt.instrumentName} | Epic: ${mkt.epic} | Price: ${pos.level}`);
            });
        } else {
            console.log('No positions found in response:', data);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
