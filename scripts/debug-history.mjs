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

async function debugHistory() {
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

    // 1. Session Login
    const sessRes = await fetch(`${url}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CAP-API-KEY': apiKey },
        body: JSON.stringify({ identifier: user.email, password, encryptedPassword: false })
    });
    const cst = sessRes.headers.get('CST');
    const xst = sessRes.headers.get('X-SECURITY-TOKEN');
    const sessData = await sessRes.json();
    const accounts = sessData.accounts || [];

    // 2. Identify Sub-accounts
    let demoAccs = accounts.filter(a => a.accountType === 'SPREADBET' || (a.accountName || '').toLowerCase().includes('demo'));
    let realAccs = accounts.filter(a => a.accountType !== 'SPREADBET' && !(a.accountName || '').toLowerCase().includes('demo'));

    if (demoAccs.length === 0 && realAccs.length > 1) {
        const gbpAcc = realAccs.find(a => a.currency === 'GBP');
        if (gbpAcc) demoAccs = [gbpAcc];
    }

    const demoAccId = demoAccs[0]?.accountId;
    const realAccId = realAccs[0]?.accountId;

    // Helper to fetch history
    async function fetchAccHistory(accId, name) {
        console.log(`\n\n=== Fetching ${name} HISTORY (${accId}) ===`);
        // Switch context
        await fetch(`${url}/session`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'CST': cst, 'X-SECURITY-TOKEN': xst },
            body: JSON.stringify({ accountId: accId })
        });

        // Try full history 
        const histRes = await fetch(`${url}/history/activity?max=100`, {
            headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst }
        });
        const d = await histRes.json();
        console.log(`History Activities length: ${d.activities ? d.activities.length : 0}`);
        if (d.activities && d.activities.length > 0) {
            console.log(JSON.stringify(d.activities.slice(0, 2), null, 2));
        }
    }

    if (demoAccId) await fetchAccHistory(demoAccId, "DEMO");
    if (realAccId) await fetchAccHistory(realAccId, "REAL");
}

debugHistory().catch(console.error);
