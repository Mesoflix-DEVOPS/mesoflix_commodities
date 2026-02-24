import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = crypto.scryptSync(process.env.CAPITAL_ENCRYPTION_KEY || 'default-unsafe-key', 'salt', 32);

function decrypt(text) {
    if (!text || !text.includes(':')) return text;
    try {
        const [ivHex, tagHex, encryptedHex] = text.split(':');
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        return decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
    } catch { return null; }
}

async function debugCapitalCom() {
    const user = (await sql`SELECT * FROM users LIMIT 1`)[0];
    const creds = await sql`SELECT * FROM capital_accounts WHERE user_id = ${user.id}`;

    for (const acc of creds) {
        console.log(`\n========================================`);
        console.log(`Testing Credential: "${acc.label}" (Active: ${acc.is_active})`);

        const decryptedKey = decrypt(acc.encrypted_api_key);
        let apiKey, password;

        if (decryptedKey && decryptedKey.startsWith('{') && decryptedKey.includes('"apiKey"')) {
            const parsed = JSON.parse(decryptedKey);
            apiKey = parsed.apiKey;
            password = parsed.password;
        } else {
            apiKey = decryptedKey;
            password = decrypt(acc.encrypted_api_password);
        }

        if (!apiKey || !password) {
            console.log(`Could not decrypt keys for ${acc.label}`);
            continue;
        }

        async function testServer(url, name) {
            console.log(`\n  === Testing ${name} SERVER (${url}) ===`);
            const sessRes = await fetch(`${url}/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CAP-API-KEY': apiKey },
                body: JSON.stringify({ identifier: user.email, password, encryptedPassword: false })
            });

            if (!sessRes.ok) {
                console.log(`  [POST /session] Failed: ${sessRes.status} ${await sessRes.text()}`);
                return;
            }

            const cst = sessRes.headers.get('CST');
            const xst = sessRes.headers.get('X-SECURITY-TOKEN');
            const sessData = await sessRes.json();

            // Find Demo Account
            const accounts = sessData.accounts || [];
            if (accounts.length === 0) return console.log('  No accounts found.');

            let demoAccs = accounts.filter(a => a.accountType === 'SPREADBET' || (a.accountName || '').toLowerCase().includes('demo'));
            let realAccs = accounts.filter(a => a.accountType !== 'SPREADBET' && !(a.accountName || '').toLowerCase().includes('demo'));

            if (demoAccs.length === 0 && realAccs.length > 1) {
                const gbpAcc = realAccs.find(a => a.currency === 'GBP');
                if (gbpAcc) demoAccs = [gbpAcc];
            }

            const demoAcc = demoAccs[0] || accounts[1];
            if (!demoAcc) return console.log('  Could not identify Demo account.');

            console.log(`  Demo Account ID: ${demoAcc.accountId}`);

            // Switch to Demo
            const switchRes = await fetch(`${url}/session`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'CST': cst, 'X-SECURITY-TOKEN': xst },
                body: JSON.stringify({ accountId: demoAcc.accountId })
            });

            if (!switchRes.ok) {
                console.log(`  [PUT /session] Failed: ${switchRes.status} ${await switchRes.text()}`);
                return;
            }
            console.log(`  [PUT /session] Switched active account successfully.`);

            // Try to place a trade
            const epic = 'GOLD'; // Gold
            console.log(`  [POST /positions] Attempting BUY 1 ${epic}...`);
            const tradeRes = await fetch(`${url}/positions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'CST': cst, 'X-SECURITY-TOKEN': xst },
                body: JSON.stringify({
                    epic,
                    direction: 'BUY',
                    size: 1,
                    orderType: 'MARKET',
                    guaranteedStop: false,
                    forceOpen: true
                })
            });

            console.log(`  Status: ${tradeRes.status}`);
            console.log(`  Response: ${await tradeRes.text()}`);
        }

        await testServer('https://api-capital.backend-capital.com/api/v1', 'LIVE');
    }
}

debugCapitalCom();
