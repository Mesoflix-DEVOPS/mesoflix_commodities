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
            const accRes = await fetch(`${url}/accounts`, {
                headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst }
            });
            const accData = await accRes.json();
            console.log(`\n  [GET /accounts] Full JSON:`);
            console.log(JSON.stringify(accData, null, 2));
        }

        await testServer('https://api-capital.backend-capital.com/api/v1', 'LIVE');
    }
}

debugCapitalCom();
