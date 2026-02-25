import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import fs from 'fs';

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

async function run() {
    const user = (await sql`SELECT * FROM users LIMIT 1`)[0];
    const creds = await sql`SELECT * FROM capital_accounts WHERE user_id = ${user.id}`;
    const acc = creds[0];

    const decryptedKey = decrypt(acc.encrypted_api_key);
    let apiKey = decryptedKey;
    let password = decrypt(acc.encrypted_api_password);
    if (decryptedKey && decryptedKey.startsWith('{') && decryptedKey.includes('"apiKey"')) {
        const parsed = JSON.parse(decryptedKey);
        apiKey = parsed.apiKey;
        password = parsed.password;
    }

    const url = 'https://api-capital.backend-capital.com/api/v1';

    // Login
    const sessRes = await fetch(`${url}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CAP-API-KEY': apiKey },
        body: JSON.stringify({ identifier: user.email, password, encryptedPassword: false })
    });
    const cst = sessRes.headers.get('CST');
    const xst = sessRes.headers.get('X-SECURITY-TOKEN');
    const sessData = await sessRes.json();
    const demoAccId = sessData.accounts.find(a => a.accountType === 'SPREADBET')?.accountId;

    // Switch
    await fetch(`${url}/session`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'CST': cst, 'X-SECURITY-TOKEN': xst },
        body: JSON.stringify({ accountId: demoAccId })
    });

    const results = {};

    // Test 1: No Dates
    const r1 = await fetch(`${url}/history/activity?max=100`, { headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst } });
    results['Test_1_NoDates'] = await r1.json();

    // Test 2: Hardcoded 24 Hours
    const from24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('.')[0];
    const toCurrent = new Date().toISOString().split('.')[0];
    const r2 = await fetch(`${url}/history/activity?max=100&from=${from24}&to=${toCurrent}`, { headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst } });
    results['Test_2_24Hours'] = await r2.json();

    // Test 3: Hardcoded 7 Days
    const from7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('.')[0];
    const r3 = await fetch(`${url}/history/activity?max=100&from=${from7}&to=${toCurrent}`, { headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst } });
    results['Test_3_7Days'] = await r3.json();

    fs.writeFileSync('debug-out.json', JSON.stringify(results, null, 2));
    console.log("Wrote pure JSON to debug-out.json successfully.");
}

run().catch(console.error);
