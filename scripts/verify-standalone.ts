
import * as dotenv from 'dotenv';

dotenv.config();

const LIVE_API = 'https://api-capital.backend-capital.com/api/v1';
const DEMO_API = 'https://demo-api-capital.backend-capital.com/api/v1';

async function fetchBalance(apiUrl: string, identifier: string, password: string, apiKey: string, label: string) {
    console.log(`\n--- [${label}] Handshake Initializing ---`);
    try {
        // 1. Session Create
        const loginRes = await fetch(`${apiUrl}/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CAP-API-KEY': apiKey,
            },
            body: JSON.stringify({ identifier, password, encryptedPassword: false }),
        });

        if (!loginRes.ok) {
            console.error(`[${label}] Login Failed: ${loginRes.status} ${loginRes.statusText}`);
            console.error(await loginRes.text());
            return;
        }

        const data = await loginRes.json();
        const cst = loginRes.headers.get('CST');
        const xst = loginRes.headers.get('X-SECURITY-TOKEN');

        if (!cst || !xst) {
            console.error(`[${label}] Missing Tokens`);
            return;
        }

        console.log(`[${label}] Session Established.`);

        // 2. Fetch Accounts
        const accRes = await fetch(`${apiUrl}/accounts`, {
            headers: {
                'CST': cst,
                'X-SECURITY-TOKEN': xst,
            },
        });

        if (!accRes.ok) {
            console.error(`[${label}] Fetch Accounts Failed: ${accRes.status}`);
            return;
        }

        const accData = await accRes.json();
        console.log(`[${label}] Accounts Found: ${accData.accounts?.length || 0}`);

        (accData.accounts || []).forEach((acc: any) => {
            console.log(` >> AccountID: ${acc.accountId} | Name: ${acc.accountName} | Type: ${acc.accountType} | Balance: ${acc.balance.balance} ${acc.balance.currency}`);
        });

    } catch (e: any) {
        console.error(`[${label}] Error: ${e.message}`);
    }
}

async function main() {
    const identifier = process.argv[2] || 'lemicmelic@gmail.com';
    const password = process.argv[3];
    const apiKey = process.argv[4];

    if (!password || !apiKey) {
        console.error("Usage: npx tsx scripts/verify-standalone.ts <id> <pass> <key>");
        process.exit(1);
    }

    // Isolated Call 1: REAL
    await fetchBalance(LIVE_API, identifier, password, apiKey, "REAL-SERVER");

    // Isolated Call 2: DEMO
    await fetchBalance(DEMO_API, identifier, password, apiKey, "DEMO-SERVER");
}

main();
